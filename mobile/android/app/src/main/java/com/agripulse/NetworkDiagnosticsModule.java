package com.agripulse;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * AgriPulse - Android native module (Java).
 *
 * Exposes network-diagnostics helpers to the React Native JS layer:
 *   - getNetworkStatus()         - connectivity type & metering via ConnectivityManager
 *   - pingHost(host, port, t)    - TCP reachability + latency to the backend
 *   - checkWebSocket(host, port) - TCP reachability of the WebSocket port
 *   - runHealthCheck(host, port) - combined network + backend + websocket + device info
 *   - getDeviceNetworkInfo()     - device model + Android version
 *
 * All blocking socket work runs on a background executor; results are returned
 * to JS through Promises so the UI thread is never blocked.
 */
public class NetworkDiagnosticsModule extends ReactContextBaseJavaModule {

    public static final String NAME = "NetworkDiagnosticsModule";

    private final ReactApplicationContext reactContext;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public NetworkDiagnosticsModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }

    // -- Network status --------------------------------------------------------

    @ReactMethod
    public void getNetworkStatus(Promise promise) {
        try {
            promise.resolve(buildNetworkStatus());
        } catch (Exception e) {
            promise.reject("E_NETWORK_STATUS", e.getMessage(), e);
        }
    }

    private WritableMap buildNetworkStatus() {
        WritableMap map = Arguments.createMap();
        ConnectivityManager cm =
                (ConnectivityManager) reactContext.getSystemService(Context.CONNECTIVITY_SERVICE);

        boolean connected = false;
        boolean isWifi = false;
        boolean isCellular = false;
        boolean isMetered = false;
        String type = "NONE";

        if (cm != null) {
            isMetered = cm.isActiveNetworkMetered();
            Network active = cm.getActiveNetwork();
            NetworkCapabilities caps = active != null ? cm.getNetworkCapabilities(active) : null;
            if (caps != null) {
                connected = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
                if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                    isWifi = true;
                    type = "WIFI";
                } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
                    isCellular = true;
                    type = "CELLULAR";
                } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                    type = "ETHERNET";
                } else {
                    type = "UNKNOWN";
                }
            }
        }

        map.putBoolean("connected", connected);
        map.putString("type", type);
        map.putBoolean("isWifi", isWifi);
        map.putBoolean("isCellular", isCellular);
        map.putBoolean("isMetered", isMetered);
        return map;
    }

    // -- TCP reachability ------------------------------------------------------

    @ReactMethod
    public void pingHost(String host, int port, int timeoutMs, Promise promise) {
        executor.execute(() -> promise.resolve(tcpReachability(host, port, timeoutMs)));
    }

    @ReactMethod
    public void checkWebSocket(String host, int port, int timeoutMs, Promise promise) {
        // The WebSocket shares the backend HTTP port; a successful TCP connect to
        // that port indicates the WS endpoint is reachable.
        executor.execute(() -> promise.resolve(tcpReachability(host, port, timeoutMs)));
    }

    private WritableMap tcpReachability(String host, int port, int timeoutMs) {
        WritableMap map = Arguments.createMap();
        long start = System.currentTimeMillis();
        Socket socket = new Socket();
        try {
            socket.connect(new InetSocketAddress(host, port), timeoutMs);
            long latency = System.currentTimeMillis() - start;
            map.putBoolean("reachable", true);
            map.putInt("latencyMs", (int) latency);
            map.putString("detail", "Connected to " + host + ":" + port);
        } catch (IOException e) {
            map.putBoolean("reachable", false);
            map.putInt("latencyMs", -1);
            map.putString("detail", "Failed: " + e.getMessage());
        } finally {
            try {
                socket.close();
            } catch (IOException ignored) {
            }
        }
        return map;
    }

    // -- Device info -----------------------------------------------------------

    @ReactMethod
    public void getDeviceNetworkInfo(Promise promise) {
        promise.resolve(buildDeviceInfo());
    }

    private WritableMap buildDeviceInfo() {
        WritableMap map = Arguments.createMap();
        map.putString("deviceModel", Build.MANUFACTURER + " " + Build.MODEL);
        map.putString("androidVersion", "Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")");
        return map;
    }

    // -- Combined health check -------------------------------------------------

    @ReactMethod
    public void runHealthCheck(String host, int port, Promise promise) {
        executor.execute(() -> {
            try {
                WritableMap result = Arguments.createMap();
                result.putMap("network", buildNetworkStatus());
                result.putMap("backend", tcpReachability(host, port, 3000));
                result.putMap("websocket", tcpReachability(host, port, 3000));
                WritableMap device = buildDeviceInfo();
                result.putString("deviceModel", device.getString("deviceModel"));
                result.putString("androidVersion", device.getString("androidVersion"));
                result.putDouble("checkedAt", System.currentTimeMillis());
                promise.resolve(result);
            } catch (Exception e) {
                promise.reject("E_HEALTH_CHECK", e.getMessage(), e);
            }
        });
    }
}
