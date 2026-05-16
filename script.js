const downloadBtn = document.getElementById("downloadBtn");
const previewModal = document.getElementById("pdfPreviewModal");
const previewFrame = document.getElementById("pdfPreviewFrame");
const confirmDownloadBtn = document.getElementById("confirmDownloadBtn");
const cancelPreviewBtn = document.getElementById("cancelPreviewBtn");

let cachedPdf = null;
let cachedBlobUrl = null;

const closePreview = () => {
  if (!previewModal) {
    return;
  }

  previewModal.classList.remove("is-open");
  previewModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  if (previewFrame) {
    previewFrame.src = "about:blank";
  }

  if (cachedBlobUrl) {
    URL.revokeObjectURL(cachedBlobUrl);
    cachedBlobUrl = null;
  }

  cachedPdf = null;
};

const openPreview = (blobUrl) => {
  if (!previewModal || !previewFrame) {
    return;
  }

  previewFrame.src = blobUrl;
  previewModal.classList.add("is-open");
  previewModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
};

const buildPdfFromResume = async () => {
  const resume = document.getElementById("resume");
  const html2canvasRef = window.html2canvas;
  const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF
    ? window.jspdf.jsPDF
    : window.jsPDF;

  if (!resume || typeof html2canvasRef !== "function" || !jsPDFConstructor) {
    throw new Error("PDF libraries failed to load.");
  }

  document.body.classList.add("pdf-export");

  try {
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const rect = resume.getBoundingClientRect();
    const a4WidthPx = rect.width;
    const a4HeightPx = (rect.width * 310) / 200;

    const canvas = await html2canvasRef(resume, {
      scale: 2,
      useCORS: true,
      scrollY: -window.scrollY,
      backgroundColor: "#ffffff"
    });

    const imgData = canvas.toDataURL("image/jpeg", 1.0);
    const pdf = new jsPDFConstructor({
      orientation: "portrait",
      unit: "px",
      format: [a4WidthPx, a4HeightPx]
    });

    const ratio = Math.min(
      a4WidthPx / canvas.width,
      a4HeightPx / canvas.height
    );
    const imgWidth = canvas.width * ratio;
    const imgHeight = canvas.height * ratio;
    const x = (a4WidthPx - imgWidth) / 2;
    const y = (a4HeightPx - imgHeight) / 2;

    pdf.addImage(imgData, "JPEG", x, y, imgWidth, imgHeight);

    const linkElements = Array.from(resume.querySelectorAll("a[href]"));
    const renderScale = canvas.width / rect.width;

    linkElements.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }

      const linkRect = link.getBoundingClientRect();
      const relX = (linkRect.left - rect.left) * renderScale;
      const relY = (linkRect.top - rect.top) * renderScale;
      const relW = linkRect.width * renderScale;
      const relH = linkRect.height * renderScale;

      if (relW <= 0 || relH <= 0) {
        return;
      }

      const pdfX = x + relX * ratio;
      const pdfY = y + relY * ratio;
      const pdfW = relW * ratio;
      const pdfH = relH * ratio;

      pdf.link(pdfX, pdfY, pdfW, pdfH, { url: link.href });
    });

    return pdf;
  } finally {
    document.body.classList.remove("pdf-export");
  }
};

if (downloadBtn) {
  downloadBtn.addEventListener("click", async () => {
    const originalLabel = downloadBtn.textContent;
    downloadBtn.disabled = true;
    downloadBtn.textContent = "Preparing preview...";

    try {
      cachedPdf = await buildPdfFromResume();

      if (cachedBlobUrl) {
        URL.revokeObjectURL(cachedBlobUrl);
      }

      const blob = cachedPdf.output("blob");
      cachedBlobUrl = URL.createObjectURL(blob);
      openPreview(cachedBlobUrl);
    } catch (error) {
      console.error(error);
      alert("Sorry, the PDF preview could not be generated. Please try again.");
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.textContent = originalLabel;
    }
  });
}

if (confirmDownloadBtn) {
  confirmDownloadBtn.addEventListener("click", () => {
    if (!cachedPdf) {
      return;
    }

    confirmDownloadBtn.disabled = true;
    cachedPdf.save("VENKATESH.pdf");
    confirmDownloadBtn.disabled = false;
    closePreview();
  });
}

if (cancelPreviewBtn) {
  cancelPreviewBtn.addEventListener("click", closePreview);
}

if (previewModal) {
  const closeTargets = previewModal.querySelectorAll("[data-close]");
  closeTargets.forEach((target) => target.addEventListener("click", closePreview));
}

document.addEventListener("keydown", (event) => {
  if (!previewModal || !previewModal.classList.contains("is-open")) {
    return;
  }

  if (event.key === "Escape") {
    closePreview();
  }
});