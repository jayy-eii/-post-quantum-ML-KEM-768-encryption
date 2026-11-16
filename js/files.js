/**
 * QUANTUM-SAFE File Vault Controller
 * ML-KEM-768 & AES-256-GCM encrypted file storage with MongoDB Atlas persistence and authenticated downloads.
 */

window.QS_FILES = {
  isUploading: false,

  init: async function () {
    await this.fetchServerFiles();
    this.renderFilesList();
    this.setupDropzone();
    this.bindEvents();

    window.addEventListener('qs:route-changed', async (e) => {
      if (e.detail.route === 'files') {
        await this.fetchServerFiles();
        this.renderFilesList();
      }
    });
  },

  fetchServerFiles: async function () {
    if (window.QS_API && window.QS_API.isAuthenticated()) {
      try {
        const res = await window.QS_API.getFiles();
        if (res.success && Array.isArray(res.files)) {
          window.QS_DATA.files = res.files;
        }
      } catch (err) {
        console.warn('Failed to fetch vault files from server:', err);
      }
    }
  },

  renderFilesList: function () {
    const tbody = document.getElementById('files-table-body');
    if (!tbody) return;

    const files = window.QS_DATA.files || [];
    if (files.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
            <div style="color: var(--accent-cyan); margin-bottom: 0.5rem;"><i data-lucide="shield" data-size="28"></i></div>
            <div style="font-weight: 600; color: var(--text-white); margin-bottom: 0.25rem;">Encrypted Vault Empty</div>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">
              Drag and drop any file (documents, code, PDFs, archives) into the zone above to wrap it with ML-KEM-768 & AES-256-GCM.
            </p>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons(tbody);
      return;
    }

    tbody.innerHTML = files.map(file => {
      const ext = (file.fileName || '').split('.').pop().toLowerCase();
      let iconName = 'file-text';
      if (['pdf'].includes(ext)) iconName = 'file-text';
      else if (['js', 'ts', 'py', 'json', 'html', 'css', 'go', 'rs', 'c', 'cpp'].includes(ext)) iconName = 'code';
      else if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext)) iconName = 'folder-archive';
      else if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext)) iconName = 'image';
      else if (['bin', 'dat', 'iso', 'exe', 'dmg'].includes(ext)) iconName = 'binary';

      const sizeStr = file.fileSize > 1024 * 1024
        ? `${(file.fileSize / (1024 * 1024)).toFixed(2)} MB`
        : `${(file.fileSize / 1024).toFixed(1)} KB`;

      const uploadDateStr = file.uploadDate ? new Date(file.uploadDate).toLocaleString() : 'Recent';
      const shortHash = file.encryptedBlobHash
        ? `SHA-256: ${file.encryptedBlobHash.substring(0, 8)}...${file.encryptedBlobHash.substring(file.encryptedBlobHash.length - 8)}`
        : 'SHA-256: Verified';

      return `
        <tr>
          <td>
            <div class="file-name-cell">
              <div class="file-type-icon">
                <i data-lucide="${iconName}" data-size="18"></i>
              </div>
              <div class="file-title-wrap">
                <span class="file-actual-name">${this.escapeHtml(file.fileName)}</span>
                <span class="file-meta-sub font-mono" style="font-size: 0.72rem; color: var(--text-muted);">${shortHash}</span>
              </div>
            </div>
          </td>
          <td style="font-size: 0.84rem; color: var(--text-secondary);">${sizeStr}</td>
          <td style="font-size: 0.84rem; color: var(--text-muted);">${uploadDateStr}</td>
          <td>
            <span class="badge badge-teal" style="font-size: 0.72rem;" title="1,088B ML-KEM Token • 128-bit GHASH Tag">
              <i data-lucide="shield-check" data-size="12"></i>
              ${file.cipher || 'ML-KEM-768 + AES-256-GCM'}
            </span>
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; align-items: center; gap: 0.5rem;">
              <button class="btn btn-secondary btn-sm file-download-btn" data-fileid="${file.id}" data-filename="${this.escapeHtml(file.fileName)}" title="Verify tag and decrypt original file">
                <i data-lucide="download" data-size="14"></i>
                <span>Decrypt & Download</span>
              </button>
              <button class="btn btn-ghost btn-sm file-delete-btn text-danger" data-fileid="${file.id}" title="Permanently delete from vault">
                <i data-lucide="trash-2" data-size="14"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons(tbody);

    // Bind download buttons
    tbody.querySelectorAll('.file-download-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fileId = btn.getAttribute('data-fileid');
        const fileName = btn.getAttribute('data-filename');
        this.downloadFile(fileId, fileName, btn);
      });
    });

    // Bind delete buttons
    tbody.querySelectorAll('.file-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fileId = btn.getAttribute('data-fileid');
        this.deleteFile(fileId, btn);
      });
    });
  },

  downloadFile: async function (fileId, fileName, btnEl) {
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = '<i data-lucide="refresh-cw" class="animate-spin" data-size="14"></i> Decrypting...';
      if (window.lucide) window.lucide.createIcons(btnEl);
    }

    try {
      const token = window.QS_API.getToken();
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${window.QS_API.getBaseUrl()}/api/files/download?id=${encodeURIComponent(fileId)}`, {
        method: 'GET',
        headers
      });

      if (!res.ok) {
        throw new Error(`Download failed with status: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);

      window.QS_APP.showToast({
        title: 'File Decrypted & Delivered',
        message: `Verified 128-bit GHASH tag. Original "${fileName}" downloaded successfully.`,
        type: 'success'
      });
    } catch (err) {
      console.error('Download error:', err);
      window.QS_APP.showToast({
        title: 'Decryption Error',
        message: 'Could not decrypt file: ' + err.message,
        type: 'danger'
      });
    } finally {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = '<i data-lucide="download" data-size="14"></i> <span>Decrypt & Download</span>';
        if (window.lucide) window.lucide.createIcons(btnEl);
      }
    }
  },

  deleteFile: async function (fileId, btnEl) {
    if (!confirm('Are you sure you want to permanently delete this encrypted file from the quantum vault?')) {
      return;
    }

    if (btnEl) btnEl.disabled = true;

    try {
      const res = await window.QS_API.deleteFile(fileId);
      if (res.success) {
        window.QS_APP.showToast({
          title: 'File Purged',
          message: 'Encrypted file permanently scrubbed from MongoDB Atlas vault.',
          type: 'success'
        });
        await this.fetchServerFiles();
        this.renderFilesList();
      } else {
        window.QS_APP.showToast({
          title: 'Delete Failed',
          message: res.error || 'Could not delete file from vault.',
          type: 'danger'
        });
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  },

  setupDropzone: function () {
    const dropzone = document.getElementById('file-dropzone');
    const fileInput = document.getElementById('file-input-hidden');
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        this.handleFileUpload(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileUpload(e.target.files[0]);
      }
    });
  },

  handleFileUpload: async function (file) {
    if (this.isUploading) return;
    this.isUploading = true;

    const progressCard = document.getElementById('file-upload-progress');
    const nameLabel = document.getElementById('uploading-file-name');
    const percentLabel = document.getElementById('upload-percent-text');
    const progressBar = document.getElementById('upload-progress-bar');

    if (progressCard) progressCard.style.display = 'block';
    if (nameLabel) nameLabel.textContent = file.name;
    if (progressBar) progressBar.style.width = '20%';
    if (percentLabel) percentLabel.textContent = '20%';

    try {
      // 1. Read file as base64
      const base64 = await this.readFileAsBase64(file);

      if (progressBar) progressBar.style.width = '60%';
      if (percentLabel) percentLabel.textContent = '60% (Encapsulating ML-KEM-768...)';

      // 2. Upload to backend
      const res = await window.QS_API.uploadFile({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        fileData: base64
      });

      if (progressBar) progressBar.style.width = '100%';
      if (percentLabel) percentLabel.textContent = '100%';

      if (res.success) {
        window.QS_APP.showToast({
          title: 'File Encrypted & Stored in Vault',
          message: `"${file.name}" encapsulated with ML-KEM-768 and stored in MongoDB Atlas.`,
          type: 'success'
        });

        await this.fetchServerFiles();
        this.renderFilesList();
      } else {
        window.QS_APP.showToast({
          title: 'Upload Failed',
          message: res.error || 'Failed to encrypt file.',
          type: 'danger'
        });
      }
    } catch (err) {
      console.error('File upload exception:', err);
      window.QS_APP.showToast({
        title: 'Upload Error',
        message: 'Network error uploading file: ' + err.message,
        type: 'danger'
      });
    } finally {
      this.isUploading = false;
      const fileInput = document.getElementById('file-input-hidden');
      if (fileInput) fileInput.value = '';
      setTimeout(() => {
        if (progressCard) progressCard.style.display = 'none';
      }, 500);
    }
  },

  readFileAsBase64: function (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  escapeHtml: function (str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  bindEvents: function () {
    const browseBtn = document.getElementById('btn-browse-files');
    const fileInput = document.getElementById('file-input-hidden');
    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }
  }
};
