#!/usr/bin/env python3
"""Rend tools/art.html dans un Chromium headless (protocole CDP) : fond orbe (PNG transparent) et vidéo de démarrage (images PNG).
Usage : render.py <url de art.html> <cdp ws http://hôte:port> <dossier de sortie>"""
import base64, json, os, sys, time, urllib.request
import websocket

url, cdp, out = sys.argv[1:4]
os.makedirs(out + "/frames", exist_ok=True)
t = json.load(urllib.request.urlopen(urllib.request.Request(cdp + "/json/new?about:blank", method="PUT")))
ws, n = websocket.create_connection(t["webSocketDebuggerUrl"], timeout=60), 0


def cmd(method, **params):
    global n
    n += 1
    ws.send(json.dumps({"id": n, "method": method, "params": params}))
    while True:
        m = json.loads(ws.recv())
        if m.get("id") == n:
            return m.get("result", {})


def shot(path, w, h):
    png = cmd("Page.captureScreenshot", format="png", clip={"x": 0, "y": 0, "width": w, "height": h, "scale": 1})["data"]
    open(path, "wb").write(base64.b64decode(png))


def load(mode, w, h):
    cmd("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=1, mobile=False)
    cmd("Emulation.setDefaultBackgroundColorOverride", color={"r": 0, "g": 0, "b": 0, "a": 0})
    cmd("Page.navigate", url=url + "?mode=" + mode)
    time.sleep(1.5)
    cmd("Runtime.evaluate", expression="document.fonts.ready", awaitPromise=True)


cmd("Page.enable")
load("bg", 1920, 1080)
cmd("Runtime.evaluate", expression="render(2)")
shot(out + "/orb.png", 1920, 1080)

load("boot", 1280, 800)
for i in range(120):                       # 4 s à 30 i/s
    cmd("Runtime.evaluate", expression="render(%f)" % (i / 30))
    shot("%s/frames/%03d.png" % (out, i), 1280, 800)
cmd("Page.close")
