(function () {
    'use strict';

    var MAX_SIDE = 2000;
    var JPEG_QUALITY = 0.85;

    function getCsrfToken() {
        var input = document.querySelector('input[name="csrf_token"]');
        return input ? input.value : '';
    }

    function compressImage(file) {
        return new Promise(function (resolve) {
            if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
                // HEIC/HEIF и прочее браузер canvas'ом не разожмёт — грузим как есть.
                resolve(file);
                return;
            }
            var img = new Image();
            var url = URL.createObjectURL(file);
            img.onload = function () {
                URL.revokeObjectURL(url);
                var scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
                var w = Math.round(img.width * scale);
                var h = Math.round(img.height * scale);
                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob(function (blob) {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    resolve(new File([blob], file.name, { type: blob.type || file.type }));
                }, file.type === 'image/png' ? 'image/png' : 'image/jpeg', JPEG_QUALITY);
            };
            img.onerror = function () {
                URL.revokeObjectURL(url);
                resolve(file);
            };
            img.src = url;
        });
    }

    function uploadPhoto(file, productId) {
        return compressImage(file).then(function (compressed) {
            var fd = new FormData();
            fd.append('photo', compressed);
            fd.append('product_id', productId);
            fd.append('csrf_token', getCsrfToken());
            return fetch('photo-upload.php', { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function (r) { return r.json(); });
        });
    }

    var dropZone = document.getElementById('photo-upload-drop');
    var fileInput = document.getElementById('photo-input');
    var grid = document.getElementById('photo-grid');

    if (dropZone && fileInput) {
        var productId = new URLSearchParams(window.location.search).get('id');

        dropZone.addEventListener('click', function () { fileInput.click(); });
        dropZone.addEventListener('dragover', function (e) { e.preventDefault(); });
        dropZone.addEventListener('drop', function (e) {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
        });
        fileInput.addEventListener('change', function () {
            handleFiles(fileInput.files);
        });

        function handleFiles(fileList) {
            var files = Array.prototype.slice.call(fileList);
            if (!files.length) {
                return;
            }
            dropZone.classList.add('is-uploading');
            dropZone.textContent = 'Загрузка…';

            var chain = Promise.resolve();
            files.forEach(function (file) {
                chain = chain.then(function () { return uploadPhoto(file, productId); });
            });
            chain.then(function () {
                window.location.reload();
            }).catch(function () {
                alert('Не удалось загрузить одно из фото.');
                window.location.reload();
            });
        }
    }

    if (document.querySelector('.site-thumb')) {
        var thumbPreview = document.createElement('div');
        thumbPreview.className = 'site-thumb-preview';
        var previewImg = document.createElement('img');
        thumbPreview.appendChild(previewImg);
        document.body.appendChild(thumbPreview);

        document.addEventListener('mouseover', function (e) {
            var img = e.target.closest && e.target.closest('.site-thumb');
            if (!img) {
                return;
            }
            previewImg.src = img.src;
            var rect = img.getBoundingClientRect();
            var left = Math.min(rect.right + 10, window.innerWidth - 260);
            var top = Math.min(Math.max(rect.top, 10), window.innerHeight - 260);
            thumbPreview.style.left = left + 'px';
            thumbPreview.style.top = top + 'px';
            thumbPreview.style.display = 'block';
        });
        document.addEventListener('mouseout', function (e) {
            if (e.target.closest && e.target.closest('.site-thumb')) {
                thumbPreview.style.display = 'none';
            }
        });
    }

    if (grid) {
        grid.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-delete-photo]');
            if (!btn) {
                return;
            }
            if (!confirm('Удалить это фото?')) {
                return;
            }
            var photoId = btn.getAttribute('data-delete-photo');
            fetch('photo-delete.php', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photo_id: photoId, csrf_token: getCsrfToken() }),
            }).then(function (r) { return r.json(); }).then(function () {
                window.location.reload();
            });
        });
    }
})();
