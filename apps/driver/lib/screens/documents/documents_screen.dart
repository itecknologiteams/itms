import 'package:flutter/material.dart';

/// Document upload (docs/ui-ux.md §4: "document upload flow with camera
/// capture + status chips") needs a 3-step flow against the Document
/// service — POST /v1/documents/upload-url, a direct PUT to the returned
/// presigned storage URL, then POST /v1/documents/:mediaId/finalize —
/// before the resulting media_id can be attached via
/// POST /v1/drivers/:id/documents. Deferred from this pass: it's a
/// meaningfully larger scope (camera capture, client-side SHA-256, a
/// presigned-upload integration this sandbox hasn't even verified MinIO
/// CORS for) than the core ride flow this build prioritized. Real gap,
/// not wired up — not faked with mock upload state.
class DocumentsScreen extends StatelessWidget {
  const DocumentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Documents')),
      body: const Padding(
        padding: EdgeInsets.all(24),
        child: Text(
          "Document upload isn't wired up in this build yet. It needs a "
          "3-step flow against the Document service (signed upload URL → "
          "direct storage upload → finalize) that hasn't been built — "
          "contact support if a document needs updating.",
        ),
      ),
    );
  }
}
