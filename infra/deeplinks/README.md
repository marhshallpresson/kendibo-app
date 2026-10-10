# Deep-link verification files

Host these at **both** domains (`kendibo.ng` and `kendibo-app.pxxl.click`):

## Android — `/.well-known/assetlinks.json`

Path both domains must serve:
`https://kendibo.ng/.well-known/assetlinks.json`
`https://kendibo-app.pxxl.click/.well-known/assetlinks.json`

Before hosting, replace `REPLACE_WITH_SHA256_FINGERPRINT` with the signing
certificate fingerprint of the keystore your Play/EAS builds sign with.

Get it (any one of):

```bash
# EAS managed keystore — non-interactive dump of credentials metadata:
eas credentials   # Android → production → "Show SHA-256 fingerprint"

# Or from a local/debug keystore:
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android | grep -E "SHA-256|SHA1"
```

Use the **SHA-256** value, base64url-encoded (no `:` separators). If you only
have a SHA-1, you can put it base64url-encoded in the same field — Android
accepts either.

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.kendibo.app",
      "sha256_cert_fingerprints": ["REPLACE_WITH_SHA256_FINGERPRINT"]
    }
  }
]
```

## iOS — `/.well-known/apple-app-site-association`

Only needed once iOS builds exist (requires your Apple Team ID + bundle id):

```json
{
  "applinks": {
    "apps": []
  },
  "webcredentials": {
    "apps": []
  }
}
```

Replace `TEAMID.com.kendibo.app` inside the `apps` arrays once you have them:

```json
{
  "applids": ["TEAMID.com.kendibo.app"]
}
```

Serve with `Content-Type: application/json` (no `.json` extension at the URL).
