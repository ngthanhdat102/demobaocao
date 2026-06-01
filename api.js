const scriptURL = 'https://script.google.com/macros/s/AKfycby76gD7PT_cky3Cj4LQbqk3ZwGp-UY1wgGUXWsQUyTGk9byOmUMbZ3ABEMqJzf6shp3/exec';

const ApiService = {
    async sendData(payload) {
        const formData = new URLSearchParams();
        formData.append('payload_json', JSON.stringify(payload));

        if (!navigator.onLine) {
            this.saveOffline(payload);
            return { status: 'offline' };
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(scriptURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString(),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('Kết nối API thất bại');
            
            const result = await response.json();
            if (result.status === 'success') {
                this.syncOfflineData();
                return { status: 'success' };
            } else {
                throw new Error(result.message || 'Lỗi server');
            }
        } catch (error) {
            console.error('Lỗi mạng/Timeout, chuyển sang lưu cục bộ:', error);
            this.saveOffline(payload);
            return { status: 'cached' };
        }
    },

    saveOffline(payload) {
        let queue = JSON.parse(localStorage.getItem('eval_offline_queue')) || [];
        queue.push({ ...payload, timestamp_offline: new Date().toISOString() });
        localStorage.setItem('eval_offline_queue', JSON.stringify(queue));
    },

    async syncOfflineData() {
        let queue = JSON.parse(localStorage.getItem('eval_offline_queue')) || [];
        if (queue.length === 0) return;
        let failedItems = [];
        for (const item of queue) {
            try {
                const formData = new URLSearchParams();
                formData.append('payload_json', JSON.stringify(item));
                await fetch(scriptURL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData.toString()
                });
            } catch (err) {
                failedItems.push(item);
            }
        }
        if (failedItems.length === 0) {
            localStorage.removeItem('eval_offline_queue');
        } else {
            localStorage.setItem('eval_offline_queue', JSON.stringify(failedItems));
        }
    }
};

window.addEventListener('online', () => ApiService.syncOfflineData());

// XỬ LÝ GIAO DIỆN
document.addEventListener('DOMContentLoaded', function() {
    const chiNhanhSelect = document.getElementById('chiNhanh');
    const diemSelect = document.getElementById('diemBaoCao');
    const form = document.getElementById('reportForm');

    // Nạp dữ liệu từ DS_DON_VI (bắt buộc phải include config.js trước api.js)
    if (typeof DS_DON_VI !== 'undefined') {
        Object.keys(DS_DON_VI).forEach(cn => {
            const option = document.createElement('option');
            option.value = cn; option.textContent = cn;
            chiNhanhSelect.appendChild(option);
        });
    }

    chiNhanhSelect.addEventListener('change', function() {
        diemSelect.innerHTML = '<option value="">-- Chọn Điểm --</option>';
        if (this.value && DS_DON_VI[this.value]) {
            diemSelect.disabled = false;
            diemSelect.classList.remove('bg-gray-100', 'cursor-not-allowed');
            diemSelect.classList.add('bg-white');
            DS_DON_VI[this.value].forEach(diem => {
                const opt = document.createElement('option');
                opt.value = diem; opt.textContent = diem;
                diemSelect.appendChild(opt);
            });
        } else {
            diemSelect.disabled = true;
            diemSelect.classList.add('bg-gray-100', 'cursor-not-allowed');
        }
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault(); 
        
        // Cảnh báo không thể sửa đổi
        if (!confirm("Dữ liệu đã gửi không thể sửa đổi. Bạn có chắc chắn gửi?")) return;
        
        await executeSubmit(this);
    });
});

async function executeSubmit(formElement) {
    document.getElementById('loadingOverlay').style.display = 'flex';
    
    const formData = new FormData(formElement);
    const dataObj = {};
    
    // GOM MẢNG ĐÚNG CHUẨN
    for (let key of formData.keys()) {
        if (key.endsWith('[]')) {
            dataObj[key] = formData.getAll(key);
        } else {
            dataObj[key] = formData.get(key);
        }
    }

    const res = await ApiService.sendData(dataObj);
    document.getElementById('loadingOverlay').style.display = 'none';
    
    if (res.status === 'success') {
        alert('Đã gửi báo cáo ngày thành công!');
        formElement.reset();
        window.location.reload();
    } else if (res.status === 'cached' || res.status === 'offline') {
        handleOverload(formElement, dataObj);
    }
}

// Xử lý đếm ngược khi quá tải
function handleOverload(formElement, dataObj) {
    // Nếu bạn chưa tạo #errorOverlay trong HTML thì nó sẽ dùng Alert mặc định
    const overlay = document.getElementById('errorOverlay');
    if(overlay) {
        const countText = document.getElementById('countdownTimer');
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        
        let timeLeft = 10;
        countText.innerText = timeLeft;
        
        const timer = setInterval(() => {
            timeLeft -= 1;
            countText.innerText = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timer);
                overlay.classList.add('hidden');
                overlay.classList.remove('flex');
                executeSubmit(formElement); // Tự động thử lại
            }
        }, 1000);
    } else {
        alert('Máy chủ quá tải hoặc mất kết nối. Dữ liệu đã lưu tạm, sẽ gửi lại khi có mạng!');
        formElement.reset();
    }
}