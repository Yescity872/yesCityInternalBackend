Media storage recommendations

Options

1) Cloudinary (current):
- Pros: easy uploads from base64, built-in transformations, CDN, secure URLs.
- Cons: can be more expensive at high volume.

2) S3 + CloudFront:
- Pros: potentially cheaper at scale, full control, lifecycle rules, signed URLs.
- Cons: need to implement upload handling (presigned URLs), more infra.

Recommendation
- Start with Cloudinary for developer speed. If you grow large, migrate to S3 + CloudFront and use presigned uploads from the client.
- Enforce upload size/type checks server-side (already added in upload route).

Cost control tips
- Limit max file size and number of files per message.
- Use transformations/resizing on upload to reduce bandwidth.
- Use caching headers and CDN.

Security
- Validate MIME types and size server-side (done).
- Scan uploads for malware if needed using a third-party service for high-risk apps.
