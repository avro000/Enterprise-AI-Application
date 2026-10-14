import { LoadingSpinner, EmptyState, ConfirmModal } from "@/components/opspilot/common";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { documentsApi, type DocumentViewResponse } from "@/services/api";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { effectiveRole, relativeTime } from "@/lib/opspilot/format";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileText,
  Loader2,
  Lock,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useRef, useState, type CSSProperties, type DragEvent } from "react";
import { toast } from "sonner";

const ACCEPTED = ["pdf", "txt", "docx"] as const;
const MAX_SIZE = 20 * 1024 * 1024;

const FILE_META: Record<string, { label: string; color: string }> = {
  pdf: { label: "PDF", color: "var(--severity-critical)" },
  txt: { label: "TXT", color: "var(--info)" },
  docx: { label: "DOCX", color: "var(--status-investigating)" },
};

export default function KnowledgeBasePage() {
  const documents = useQuery(api.opspilot.listDocuments);
  const uploadDocument = useMutation(api.opspilot.uploadDocument);
  const deleteDocument = useMutation(api.opspilot.deleteDocument);
  const { user } = useAuth();

  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; filename: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewDoc, setViewDoc] = useState<DocumentViewResponse | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "chunks">("text");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManage = effectiveRole(user?.role) !== "operator";

  const handleView = async (docId: string) => {
    setViewLoading(true);
    try {
      const data = await documentsApi.view(docId);
      setViewDoc(data);
      setActiveTab("text");
    } catch (err: any) {
      console.error("Failed to view document:", err);
      toast.error(err?.response?.data?.detail || "Could not load document preview.");
    } finally {
      setViewLoading(false);
    }
  };

  const handleDownload = async (docId: string, filename: string) => {
    if (!canManage) {
      toast.error("Operators have view-only access. Only managers and administrators can download documents.");
      return;
    }
    setDownloadingId(docId);
    try {
      await documentsApi.download(docId, filename);
      toast.success(`Downloaded ${filename}`);
    } catch (err: any) {
      console.error("Failed to download document:", err);
      if (err?.response?.status === 403) {
        toast.error("Forbidden: Operator accounts have view-only access to documents.");
      } else {
        toast.error(err?.response?.data?.detail || "Could not download document.");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Document text copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    if (!(ACCEPTED as readonly string[]).includes(ext)) {
      toast.error("Unsupported file type. Only PDF, TXT and DOCX are allowed.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("File is larger than the 20MB limit.");
      return;
    }

    // Simulated upload progress, then commit metadata to the knowledge base.
    setProgress(0);
    const timer = window.setInterval(() => {
      setProgress((p) => (p === null ? null : Math.min(96, p + 12 + Math.random() * 16)));
    }, 120);

    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      await uploadDocument({
        filename: file.name,
        fileType: ext as "pdf" | "txt" | "docx",
        totalChunks: Math.max(1, Math.min(120, Math.round(file.size / 15_000))),
        file,
      });
      setProgress(100);
      toast.success(`${file.name} uploaded — indexing started.`);
      await new Promise((resolve) => setTimeout(resolve, 350));
    } catch (error) {
      console.error(error);
      toast.error("Upload failed. Please check your connection and retry.");
    } finally {
      window.clearInterval(timer);
      setProgress(null);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (canManage) void handleFiles(event.dataTransfer.files);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteDocument({ id: pendingDelete.id as Id<"documents"> });
      toast.success(`${pendingDelete.filename} removed from the knowledge base.`);
      setPendingDelete(null);
    } catch (error) {
      console.error(error);
      toast.error("Could not delete this document.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Upload area — admin/manager only (FRONTEND_SPEC §4) */}
      {canManage ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onClick={() => progress === null && fileInputRef.current?.click()}
          className={`clay relative flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-10 text-center transition-transform ${
            dragActive ? "-translate-y-0.5" : ""
          }`}
          style={{
            outline: `2px dashed ${dragActive ? "var(--primary)" : "var(--border)"}`,
            outlineOffset: "-10px",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.docx"
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <span className="flex size-14 items-center justify-center rounded-[22px] bg-primary/12 text-primary clay-press">
            <Upload className="size-6" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold">
              Drag &amp; drop files here, or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports PDF, TXT, DOCX — max 20MB. Files are chunked, embedded and
              made retrievable for the Knowledge Copilot.
            </p>
          </div>

          {progress !== null && (
            <div className="w-full max-w-md">
              <div className="clay-press h-3 w-full overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Uploading &amp; indexing… {Math.round(progress)}%
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="clay flex items-center gap-3 px-5 py-4 text-sm text-muted-foreground">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-secondary clay-press">
            📚
          </span>
          <p>
            You are signed in as an <strong>Operator</strong> — the knowledge base
            is read-only for your role. Ask a manager or admin to upload
            documents.
          </p>
        </div>
      )}

      {/* Document list */}
      <section className="clay overflow-hidden p-2">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div>
            <h2 className="font-display text-lg font-semibold">Documents</h2>
            <p className="text-xs text-muted-foreground">
              {documents === undefined
                ? "Loading…"
                : `${documents.length} file${documents.length === 1 ? "" : "s"} in the retrieval corpus`}
            </p>
          </div>
        </div>

        {!documents ? (
          <LoadingSpinner label="Loading knowledge base..." />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-6" />}
            title="No documents uploaded yet"
            message="Upload your first document to start building the knowledge base — SLAs, SOPs, contracts and playbooks become citable answers."
            action={
              canManage ? (
                <Button className="clay-btn mt-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="size-4" /> Upload a document
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="clay-table w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-semibold">File</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Chunks</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">Uploaded</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const meta = FILE_META[doc.fileType] ?? FILE_META.txt;
                  return (
                    <tr key={doc.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-3">
                          <span
                            className="flex size-9 items-center justify-center rounded-xl"
                            style={{
                              background: `color-mix(in srgb, ${meta.color} 15%, #fffdf8)`,
                              color: meta.color,
                            }}
                          >
                            <FileText className="size-4" />
                          </span>
                          <span>
                            <span className="block font-medium">{doc.filename}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {meta.label}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {doc.status === "indexed" && (
                          <span
                            className="pill"
                            style={{ "--pill-color": "var(--success)" } as CSSProperties}
                          >
                            <CheckCircle2 className="size-3" /> indexed
                          </span>
                        )}
                        {doc.status === "processing" && (
                          <span
                            className="pill"
                            style={{ "--pill-color": "var(--warning)" } as CSSProperties}
                          >
                            <Loader2 className="size-3 animate-spin" /> processing
                          </span>
                        )}
                        {doc.status === "error" && (
                          <span
                            className="pill"
                            style={{ "--pill-color": "var(--danger)" } as CSSProperties}
                          >
                            <XCircle className="size-3" /> error
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {doc.totalChunks} chunks
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell">
                        {relativeTime(doc.uploadedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Document — accessible to ALL roles (Operator, Manager, Admin) */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                            title={`View ${doc.filename}`}
                            disabled={viewLoading && viewDoc?.id === doc.id}
                            onClick={() => void handleView(doc.id)}
                          >
                            <Eye className="size-4" />
                          </Button>

                          {/* Download Document — restricted to Manager & Admin */}
                          {canManage ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                              title={`Download ${doc.filename}`}
                              disabled={downloadingId === doc.id}
                              onClick={() => void handleDownload(doc.id, doc.filename)}
                            >
                              {downloadingId === doc.id ? (
                                <Loader2 className="size-4 animate-spin text-primary" />
                              ) : (
                                <Download className="size-4" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled
                              className="cursor-not-allowed rounded-full text-muted-foreground/35 opacity-40"
                              title="Download restricted: Operators have view-only access"
                            >
                              <Download className="size-4" />
                            </Button>
                          )}

                          {/* Delete Document — Manager & Admin only */}
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-full text-muted-foreground hover:text-destructive"
                              title={`Delete ${doc.filename}`}
                              onClick={() => setPendingDelete({ id: doc.id, filename: doc.filename })}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Document View Modal — available for Operators (view-only), Managers, and Admins */}
      <Dialog
        open={viewDoc !== null || viewLoading}
        onOpenChange={(open) => {
          if (!open) {
            setViewDoc(null);
            setViewLoading(false);
          }
        }}
      >
        <DialogContent className="clay flex max-h-[85vh] w-[95vw] max-w-3xl flex-col gap-4 rounded-[28px] border-0 p-6">
          {viewLoading && !viewDoc ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading document content and chunks…</p>
            </div>
          ) : viewDoc ? (
            <>
              <DialogHeader className="gap-2 sm:gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-10 items-center justify-center rounded-2xl"
                      style={{
                        background: `color-mix(in srgb, ${FILE_META[viewDoc.file_type]?.color || "var(--primary)"} 16%, #fffdf8)`,
                        color: FILE_META[viewDoc.file_type]?.color || "var(--primary)",
                      }}
                    >
                      <FileText className="size-5" />
                    </span>
                    <div>
                      <DialogTitle className="font-display text-lg font-bold">
                        {viewDoc.filename}
                      </DialogTitle>
                      <DialogDescription className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold uppercase">{viewDoc.file_type}</span>
                        <span>•</span>
                        <span>{viewDoc.total_chunks} chunks</span>
                        <span>•</span>
                        <span>Uploaded {relativeTime(viewDoc.uploaded_at)}</span>
                        {!canManage && (
                          <span className="rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            👁️ Operator view-only
                          </span>
                        )}
                      </DialogDescription>
                    </div>
                  </div>

                  {/* Actions in header */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="clay-btn text-xs"
                      onClick={() => handleCopyText(viewDoc.full_text)}
                    >
                      {copied ? (
                        <Check className="size-3.5 text-success" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {copied ? "Copied" : "Copy text"}
                    </Button>

                    {canManage ? (
                      <Button
                        size="sm"
                        className="clay-btn text-xs"
                        disabled={downloadingId === viewDoc.id}
                        onClick={() => void handleDownload(viewDoc.id, viewDoc.filename)}
                      >
                        {downloadingId === viewDoc.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Download className="size-3.5" />
                        )}
                        Download
                      </Button>
                    ) : (
                      <div
                        title="Download restricted: Operators have view-only access"
                        className="flex items-center gap-1.5 rounded-full bg-secondary/70 px-2.5 py-1 text-[11px] text-muted-foreground"
                      >
                        <Lock className="size-3" />
                        <span>Download locked</span>
                      </div>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {/* Tab switcher: Extracted Text vs Retrieval Chunks */}
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <div className="clay-press flex w-fit items-center gap-1.5 rounded-full p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("text")}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                      activeTab === "text"
                        ? "clay-btn bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
                    }`}
                  >
                    Full Document Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("chunks")}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                      activeTab === "chunks"
                        ? "clay-btn bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
                    }`}
                  >
                    Indexed Chunks ({viewDoc.chunks?.length || 0})
                  </button>
                </div>
              </div>

              {/* Body content */}
              <div className="clay-press max-h-[50vh] flex-1 overflow-y-auto rounded-2xl p-4 text-sm leading-relaxed">
                {activeTab === "text" ? (
                  <div className="font-sans text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {viewDoc.full_text || "(No text content extracted for this document)"}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {viewDoc.chunks && viewDoc.chunks.length > 0 ? (
                      viewDoc.chunks.map((chunk) => (
                        <div
                          key={chunk.id}
                          className="clay flex flex-col gap-1.5 rounded-xl p-3 text-xs"
                        >
                          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                            <span className="flex items-center gap-1.5 text-primary">
                              <BookOpen className="size-3.5" /> Chunk #{chunk.chunk_index + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              {chunk.page_number && <span>Page {chunk.page_number}</span>}
                              {chunk.token_count && <span>• {chunk.token_count} tokens</span>}
                            </div>
                          </div>
                          <p className="mt-1 leading-relaxed whitespace-pre-wrap text-foreground/90">
                            {chunk.content}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No chunks found.</p>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="items-center gap-2 pt-1 sm:justify-between">
                <p className="text-[11px] text-muted-foreground">
                  {activeTab === "text"
                    ? `${viewDoc.full_text.length.toLocaleString()} characters extracted`
                    : `${viewDoc.chunks?.length || 0} retrieval chunks stored in Neon pgvector`}
                </p>
                <Button
                  variant="outline"
                  className="clay-btn"
                  onClick={() => setViewDoc(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={pendingDelete !== null}
        title="Delete document?"
        message={`Are you sure you want to delete ${pendingDelete?.filename ?? ""}? This removes it from the knowledge base and it will no longer be cited in answers.`}
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
