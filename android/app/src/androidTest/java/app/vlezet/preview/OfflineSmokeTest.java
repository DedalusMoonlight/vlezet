package app.vlezet.preview;

import static org.junit.Assert.*;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import android.os.ParcelFileDescriptor;
import java.io.InputStream;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class OfflineSmokeTest {
    private String js(ActivityScenario<MainActivity> scenario, String expression) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(
            expression, result -> { value.set(result); latch.countDown(); }));
        assertTrue("WebView callback timeout", latch.await(10, TimeUnit.SECONDS));
        return value.get();
    }
    private void waitFor(ActivityScenario<MainActivity> scenario, String expression) throws Exception {
        long deadline = System.currentTimeMillis() + 30000;
        while (System.currentTimeMillis() < deadline) {
            if ("true".equals(js(scenario, expression))) return;
            Thread.sleep(200);
        }
        fail("Page condition failed: " + expression + "\n" + js(scenario, "document.body.innerText"));
    }
    @Test public void bundledAppCalculatesAndRestoresOffline() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            waitFor(scenario, "document.body.innerText.includes('Рассчитать загрузку')");
            assertEquals("true", js(scenario, "window.Capacitor.isNativePlatform()"));
            assertEquals("\"https://localhost\"", js(scenario, "location.origin"));
            js(scenario, "[...document.querySelectorAll('button')].find(b=>b.textContent==='Рассчитать загрузку').click()");
            waitFor(scenario, "document.body.innerText.includes('План готов')");
            waitFor(scenario, "document.body.innerText.includes('Сохранено на устройстве')");
            js(scenario, "document.querySelector('details.file-menu').open=true");
            assertEquals("true", js(scenario, "document.body.innerText.includes('Android · Работает офлайн')"));
            js(scenario, "document.querySelector('details.file-menu').open=false");
            assertEquals("true", js(scenario, "!!document.querySelector('canvas') && !!document.querySelector('canvas').getContext('webgl2')"));
            scenario.onActivity(activity -> activity.getBridge().getWebView().reload());
            waitFor(scenario, "document.body.innerText.includes('План готов')");
            js(scenario, "[...document.querySelectorAll('.section-nav button')].find(b=>b.textContent==='План').click()");
            js(scenario, "document.querySelector('.result-column').scrollIntoView()");
            Thread.sleep(500);
            // The runner may uninstall the app after tests. Keep the screenshot outside app data.
            try (InputStream result = new ParcelFileDescriptor.AutoCloseInputStream(
                    InstrumentationRegistry.getInstrumentation().getUiAutomation()
                        .executeShellCommand("screencap -p /sdcard/vlezet-smoke.png"))) {
                byte[] buffer = new byte[1024];
                while (result.read(buffer) != -1) { }
            }
            js(scenario, "[...document.querySelectorAll('button')].find(b=>b.textContent==='3D-инструкция').click()");
            waitFor(scenario, "document.body.innerText.includes('Шаг 1 из 18')");
        }
    }
}
