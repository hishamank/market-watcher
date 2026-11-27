# Verify the Expo app

Reached from step 2 of [`SKILL.md`](SKILL.md) when the features to check include M1 to M10. The report, evidence folder and proof standards are the same as for the web.

The mobile app runs in Expo Go on a real phone. No agent tool here can tap a phone, so the owner walks mobile features by hand, following the steps below, and reports in the same table. An agent with a local Android emulator can walk the same rows itself, as described under **Android emulator**. Every control and value the steps name has a `testID` from [`docs/feature-map.md`](../../../docs/feature-map.md), ready for a device driver such as Maestro if one is ever added (it is not a dependency today).

## Launch

The phone and the computer must be on the same Wi-Fi network. Find the computer's LAN IP first: `ipconfig getifaddr en0` on macOS, `hostname -I | awk '{print $1}'` on Linux.

Start the walk gateway on all interfaces, from the repo root, in its own terminal. Use the `pnpm --filter` form: `pnpm dev` runs through Turborepo, which does not pass `HOST` through.

```bash
HOST=0.0.0.0 ALLOWED_ORIGINS=http://localhost:3000,http://<LAN IP>:4000 \
  FEED=simulator SIM_SEED=42 PORT=4000 pnpm --filter ./apps/gateway dev
```

- `HOST=0.0.0.0` lets the phone reach the gateway.
- `ALLOWED_ORIGINS` must list `http://<LAN IP>:4000`. React Native's WebSocket sends an `Origin` header made from the socket URL, on both iOS and Android, and the gateway refuses origins it does not know. Without it, prices load over REST but never tick. Setting the variable replaces the default list, so keep `http://localhost:3000` in it for the web walk.

Start Expo in a second terminal, with the gateway's LAN address baked into the bundle. It prints a QR code.

```bash
EXPO_PUBLIC_GATEWAY_URL=http://<LAN IP>:4000 pnpm --filter ./apps/mobile start
```

`EXPO_PUBLIC_GATEWAY_URL` is read when Metro bundles, so after changing it, restart with `pnpm --filter ./apps/mobile start --clear`. A value set only on the command line does not survive the restart: repeat it, as in `EXPO_PUBLIC_GATEWAY_URL=http://<LAN IP>:4000 pnpm --filter ./apps/mobile start --clear`. Without it the app uses `http://localhost:4000`, which only works in a simulator on the same machine.

An agent starting these itself (to check the bundle, not to walk) runs each under `setsid bash -c 'echo $$ > <run folder>/<name>.sid; exec <command>'` so it can stop the whole session later, adds `CI=1` to `expo start`, and uses a spare `--port` if 8081 is taken. `bin/stack` cannot start this gateway: it binds `localhost` only.

## Android emulator

An agent with the Android SDK can walk the rows on an emulator instead of a phone. The emulator reaches the host at `10.0.2.2`, so use that in place of the LAN IP: start the gateway with `HOST=0.0.0.0 ALLOWED_ORIGINS=http://localhost:3000,http://10.0.2.2:4000`, and Expo with `EXPO_PUBLIC_GATEWAY_URL=http://10.0.2.2:4000 CI=1`.

- **Open the app:** `adb shell am start -W -a android.intent.action.VIEW -p host.exp.exponent -d exp://10.0.2.2:<Metro port>`. `-p` matters when another app on the device also handles `exp://` links. `expo start --android` installs Expo Go the first time; after that, start Metro without `--android`.
- **Reload:** `CI=1` turns off Metro's file watching, so after a code change restart Metro, then `adb shell am force-stop host.exp.exponent` and open the app again.
- **Drive it:** `adb shell input tap <x> <y>` for taps. For scrubbing, hold a finger with `adb shell input motionevent DOWN <x> <y>`, move it with `MOVE`, and lift it with `UP`. Screens are in physical pixels.
- **Screenshots:** `adb exec-out screencap -p > shot.png`, taken once the finger has been still for 2 s. A screenshot taken mid-gesture slows a software-rendered emulator enough to make scrubbing look late.
- **Reduced motion:** `adb shell settings put global animator_duration_scale 0`, and the same for `transition_animation_scale` and `window_animation_scale`, then reopen Expo Go. Put all three back to `1` afterwards, even if the walk fails.
- **History chaos:** open the app's own chaos controls (M10: turn on Settings > Debug > Chaos controls, then tap the bolt in the header) and set History failures. Without a tap, send `{"type":"chaos","action":"history_failure_rate","rate":100}` over a socket to `ws://localhost:4000/ws?v=1` with an allowed `Origin`, or use the web panel at `/?debug=1` against the same gateway. It reverts after 60 s.

## Doctor

Read-only checks, in this order. Each one rules out a layer before the next:

1. On the computer: `curl -sf http://<LAN IP>:4000/stocks | grep -q '"feedMode":"simulated"' && echo gateway-lan-ok`. If this fails, the gateway is not bound to the LAN: check `HOST=0.0.0.0`.
2. On the computer, the socket handshake with the phone's origin must answer `101`. A `403` means `ALLOWED_ORIGINS` is missing the LAN origin.

   ```bash
   curl -s -o /dev/null --max-time 2 -w "%{http_code}\n" -H "Origin: http://<LAN IP>:4000" \
     -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" "http://<LAN IP>:4000/ws?v=1"
   ```

3. On the computer: `curl -s http://localhost:8081/status` prints `packager-status:running`. If Expo was started with `--port`, use that port instead of 8081.
4. **On the phone's browser**, open `http://<LAN IP>:4000/stocks`. It must show JSON containing `"feedMode":"simulated"`. If the computer passes steps 1 and 2 and the phone fails here, the problem is the network, not the app: a different Wi-Fi, a guest network that isolates clients, or the computer's firewall blocking Node.

## Open in Expo Go

Install Expo Go from the App Store or Play Store; it must be the build for SDK 58. Scan the QR code (the Camera app on iOS, Expo Go itself on Android). The first load bundles for a few seconds. A red error screen is a FAIL for every feature: copy its text into the report.

## Walk

Follow each feature's steps in the feature map and observe the expected result. For each one, take a phone screenshot after the expected state appears and save it in the run folder under `.verify/`, named by feature ID (`M2-ticks.png`). Note anything Expo Go's console or the Metro terminal prints in red.

| Feature | What to do and see |
| --- | --- |
| M1 | The app opens on **Markets**, with Markets and Watchlist tabs at the bottom. Tap a row: a detail screen opens with the ticker as its title, the company name and a price that ticks. Back returns to the list where it was. Switch to Watchlist and back. |
| M2 | Rows show name, ticker, price and a day-change pill with an arrow, a sign and a percent. Within a few seconds prices change, and a brief green or coral tint flashes behind a price that moved, green when it rose and coral when it fell, at most once a second per row. The tab bar shows drawn icons, and starring gives a light haptic tap. Scroll to the bottom: the last rows have a price at once and start ticking. Star MSFT, then NVDA: each star fills amber at once. The Watchlist tab lists NVDA first, then MSFT, both ticking. Unstar NVDA there: its row goes at once. Close Expo Go from the app switcher and reopen: MSFT is still starred. Unstar it: the Watchlist tab shows "Your watchlist is empty", and "See all stocks" returns to Markets. |
| M2, motion and failure | With a stock starred, stop the gateway (`Ctrl+C`), then close and reopen Expo Go. Markets shows skeleton rows that pulse gently for about 7 s while requests retry (three retries, 1 s, 2 s and 4 s apart), then "Couldn't load stocks" with Retry. The Watchlist tab keeps the starred ticker, with the same error and Retry, never a blank screen. Start the gateway again and tap Retry on Markets, then on each Watchlist row: the rows load and tick. Star a stock: the star pops with a small amber ring and dot burst as it fills; unstarring shows no burst. |
| M2, reduced motion | Turn on Reduce Motion (iOS: Settings > Accessibility > Motion; Android: Settings > Accessibility > Remove animations). Then close and reopen Expo Go: the flash tint reads the setting at launch. Prices still change, but no tint flashes behind them. Star a stock: it fills at once, with no scale. Repeat the gateway stop from the row above: for those 7 s the skeleton rows are a static grey fill, with no pulse. Turn the setting off and reopen Expo Go afterwards. |
| M3 | Tap AAPL. The header shows the ticker chip, the name, a ticking price and a change pill labelled "Today"; below the tabs, Today, Previous close and Last update in ET. The 1D chart spans the whole session with a dashed previous-close line, and its end dot moves with the header price. Tap 1W, 1M, 3M, 1Y and 5Y: each redraws, and the label changes ("Past week" … "Past 5 years"). Press on the chart and drag: a vertical line follows your finger, a readout above the chart shows the time in ET, the price and the change from the start of the range, and the header shows the same point. Lift: the readout goes and the header is live again. Tap the star: it fills and the Markets row agrees. |
| M3, failure | With the gateway's history failures at 100% (the app's chaos controls from M10, the web chaos panel at `/?debug=1`, or a `history_failure_rate` chaos message on the socket), open a stock not yet viewed: a skeleton, then "Couldn't load this chart" with Retry while the header keeps ticking and shows a dash. Set failures to 0 and tap Retry: the chart draws. For the older copy, view a stock's 1D, wait more than 2 minutes, set failures to 100%, close and reopen Expo Go on that stock: a grey line with no end dot and an "As of" note. |
| M3, reduced motion | With Remove animations on, reopen Expo Go and repeat the M3 row: the ranges, scrubbing, the live point and the star all work as without it. |
| M4 | BLOCKED until N08 (lifecycle). Recipe for then: press home, wait 15 s, return; the socket must have closed and reopened with fresh prices. Under 10 s, it must not reconnect. |
| M5 | BLOCKED until N08 (connection states). Recipe for then: stop the gateway for stale, and airplane mode for offline. Airplane mode also cuts Metro, but the loaded app keeps running. |
| M6 | Tap the gear on Markets or Watchlist to push Settings. With the OS set the other way, choose Dark, then Light. Each choice applies immediately on every screen, including the chart, and survives a relaunch. Choose System and change the OS appearance while the app is open. The app follows. Tap العربية and confirm the header, back chevron and segmented control mirror while prices keep ticking. Tap English to return. With Reduce Motion on, the segmented indicator jumps to the new choice. |
| M7 | On Markets, Watchlist and detail, the strip reads "Simulated" with a hollow dot. The list stays in place when the badge arrives, and the badge stays the same if the gateway stops while the app is open. Launch with the gateway already down to see an empty strip. In Arabic, the dot precedes the label in reading order. Restart with `FEED=alpaca` and relaunch Expo Go. All three screens read "Live" with a filled dot. |
| M8 | With VoiceOver on, turn on **Force market closed** in M10 or in the web chaos panel at `/?debug=1` against the same gateway. Within 1 s, "Market closed" with a moon appears after the feed badge on Markets, Watchlist and detail, and prices stop flashing. VoiceOver announces the new label once. Switch languages and confirm it stays silent. After 60 s the label clears, prices resume and the strip keeps the same height. |
| M9 | On Markets, tap the search icon: a full-screen search slides up with the keyboard and "Find a stock", and the field shows the amber focus border and ring. With VoiceOver, the back chevron reads "Close"; repeat from Watchlist. Type "aapl": skeleton rows, then AAPL first and at most 10 rows. With the keyboard still up, tap AAPL once: its detail opens. Back: the results and "aapl" are still there. Type "a" for 10 rows: with the keyboard up, the list ends at the top of the keyboard. Drag the list up: the last row comes fully into view (the drag may dismiss the keyboard). Cold-open `/search` and tap Back: Markets opens. Star AAPL in the results: Markets and Watchlist agree. Type "zzzz": the no-results state. Stop the gateway and type a new query: the banner and "Search isn't available" with Retry; start the gateway, tap Retry: results load. Repeat with Reduce Motion (the sheet fades) and in Arabic (the chevron mirrors, the search icon does not, symbols and names stay left to right). |
| M10 | Open Settings: a Debug section shows "Chaos controls", off. Turn it on: a bolt appears before the gear on Markets and Watchlist, and at the end of a detail header. Close and reopen Expo Go: the switch and the bolt are still there. Tap the bolt: a sheet rises to half height, and the prices above it keep ticking with no dimming. Drag it up: it fills the screen and dims behind. Note Reconnects, tap **Drop connection**: within a few seconds Reconnects goes up by one and prices tick again. Turn on Tick spike: a countdown pill counts down from 60 and the switch turns itself off at 0. Set History failures to 100%, open a stock not yet viewed: "Couldn't load this chart". Tap the bolt again while the sheet is open: no second sheet. Close dismisses it. With Expo Go already running the app and the switch off, open `exp://<metro-host>/--/debug` (a cold launch drops the path): no sheet, the app stays on Markets; with it on, the same link opens the sheet. In Arabic, the sheet mirrors and the numbers stay left to right. Restart the gateway with `FEED=alpaca`, then close and reopen Expo Go (feed mode is learned once per launch): the Debug section and the bolt are gone, and the `/debug` link lands on Markets. On Android, repeat the bolt, half to full drag and dismiss steps: if Expo Go ignores the half and full detents, switch `debug` to a pushed screen with `ConnectedBanner`, as issue #98 specifies, and record that. |

If prices show but never change, the socket is being refused: re-run doctor step 2.

## Stop

Press `Ctrl+C` in both terminals. An agent stops only the sessions it started, with `pkill -TERM -s <sid>` using the IDs it saved, never by name or port.

## N08 lifecycle and connection walk

- **M4 quick switch:** on a ticking detail chart, record `/health` connections and reconnects. Press Home, return in under 10 s, and confirm neither reconnects nor the chart resets.
- **M4 long background:** press Home for at least 12 s. Confirm `/health` connections drops by one. Reopen Expo Go; fresh prices and a refetched visible history must fill the interval without a gap. Record health before, during and after.
- **M5 stale:** stop only your gateway process. Markets, Watchlist and detail show `connection-banner`, muted prices and `connection-retry`. Tap Retry, restart the gateway and confirm recovery without reloading.
- **M5 offline:** disable emulator Wi-Fi and data with `adb shell svc wifi disable` and `adb shell svc data disable`. Expect Offline, muted prices and no Retry. Gateway connections must drop to 0 within about 60 s, as a half-open socket can linger; enable both radios and confirm recovery. Connecting and connected have no banner (DESIGN.md).
- **M2 batch coverage:** star a catalogue symbol outside Markets via its detail route, then visit Watchlist. Confirm its name and ticking price. Remove another star; fresh cached symbols must not fetch again. Failed symbol batches show a retry on each unresolved row; loaded rows stay usable.
- Always restore Wi-Fi and data, stop the emulator with `adb emu kill`, and stop only the Expo and gateway process groups you started. Save screenshots and health samples alongside the report. If the host cannot complete a step, report "not verified, host overloaded" rather than PASS.

