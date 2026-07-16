# Vendored browser dependencies

These runtime dependencies are self-hosted to remove third-party CDN execution risk.
Upgrade them deliberately: download over HTTPS, verify MIME type, review the upstream
release and license, update the SHA-384 inventory below, then run the security tests.

| Dependency | Version | Runtime file | SHA-384 (hex) |
|---|---:|---|---|
| DOMPurify | 3.0.6 | `dompurify/purify.min.js` | `7304ba61d84b23b5d2eb47a80e20be7a0574a87a7ccc8f829ace3a4749db9fc26b9a803357db852fad1eb4c6610274ae` |
| Font Awesome Free | 6.4.0 | `fontawesome/css/all.min.css` | `8b0dcea1312b09824907d9826bc2cd4b685bb10eccdc2d04a48b0efc7e7e1060243c673aae4f95f22d38a16fcae71ab4` |
| Quill | 1.3.6 | `quill/quill.min.js` | `00e9d85205ba31047bf04bd3aad91b35abf3edd548eddb4b9bb41d708301a32d3a69d2c8ccd4f8d211cf625f51af99b9` |
| Quill Snow theme | 1.3.6 | `quill/quill.snow.css` | `d3b51b4976ddf07a5a39fc59b223ba63c1f51d35fabf427de9be6a3fa3ca4a9604b92652603e061451e52d18ef8d5acb` |
| Montserrat + Playfair Display CSS | Google Fonts snapshot 2026-07-16 | `fonts/fonts.css` | `2a81461718805938ac4176bcb8fba73fa0db877092b49f48cc4513621c0b6b0ad215d5ce3ddf9cb07af1151dfac64a39` |

The relevant upstream license is stored beside each dependency. Font files retain
their upstream filenames so the snapshot CSS can be audited and upgraded mechanically.
