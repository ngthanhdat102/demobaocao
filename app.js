function setHeaders(output) {
  return output
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
}

function doGet() {
  return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Biểu Mẫu Báo Cáo Ngày')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Bắt buộc phải là doPost(e) để hứng Fetch API
function doPost(e) {
  try {
    // ĐÃ SỬA LỖI ĐỌC DỮ LIỆU: Dùng e.postData.contents để đọc text/plain
    const dataObj = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // BƯỚC A: Xử lý dữ liệu động thành chuỗi
    let chiTietGhiNhan = "";
    if (dataObj['pa_nguoi[]'] && Array.isArray(dataObj['pa_nguoi[]'])) {
      for (let i = 0; i < dataObj['pa_nguoi[]'].length; i++) {
        let nguoi = dataObj['pa_nguoi[]'][i] || "";
        let noidung = dataObj['pa_noidung[]'][i] || "";
        let nhom = dataObj['pa_nhom[]'][i] || "";
        let mucdo = dataObj['pa_mucdo[]'][i] || "";
        let kiennghi = dataObj['pa_kiennghi[]'][i] || "";
        
        if (nguoi.trim() !== "" || noidung.trim() !== "") {
          chiTietGhiNhan += `- [STT ${i+1}] Người PA: ${nguoi} | ND: ${noidung} | Nhóm: ${nhom} | Mức độ: ${mucdo} | KN: ${kiennghi}\n`;
        }
      }
    } else if (dataObj['pa_nguoi[]']) {
        let nguoi = dataObj['pa_nguoi[]'] || "";
        let noidung = dataObj['pa_noidung[]'] || "";
        if (nguoi.trim() !== "" || noidung.trim() !== "") {
          chiTietGhiNhan += `- [STT 1] Người PA: ${nguoi} | ND: ${noidung}\n`;
        }
    }

    // BƯỚC B: Ánh xạ 38 cột
    const row = [
      new Date(), dataObj.chiNhanh || "", dataObj.diemBaoCao || "", dataObj.kq_dvcqg || "", 
      dataObj.vm_dvcqg || "", dataObj.kq_htdp || "", dataObj.vm_htdp || "", dataObj.kq_htdp_bn || "", 
      dataObj.vm_htdp_bn || "", dataObj.kq_duongtruyen || "", dataObj.vm_duongtruyen || "", dataObj.kq_vneid || "", 
      dataObj.vm_vneid || "", dataObj.tkcb_tong || "", dataObj.tkcb_daco || "", dataObj.tkcb_chuaco || "", 
      dataObj.tkcb_login_ok || "", dataObj.tkcb_login_fail || "", dataObj.vm_tkcb || "", dataObj.pq_dung || "", 
      dataObj.pq_loi || "", dataObj.pq_quantri_biet || "", dataObj.vm_pq || "", dataObj.kq_dvc_hienthi || "", 
      dataObj.dvc_hienthi_thieu || "", dataObj.vm_dvc_hienthi || "", dataObj.dbhs_dung || "", dataObj.dbhs_cham || "", 
      dataObj.dbhs_loi || "", dataObj.dbhs_ma_loi || "", dataObj.vm_dbhs || "", dataObj.kq_bcsl || "", 
      dataObj.vm_bcsl || "", dataObj.pa_tong || "", dataObj.pa_daxuly || "", dataObj.pa_chuaxuly || "", 
      dataObj.vm_pa || "", chiTietGhiNhan.trim()
    ];

    sheet.appendRow(row);
    return setHeaders(ContentService.createTextOutput(JSON.stringify({ status: 'success' })));
  } catch (error) {
    return setHeaders(ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })));
  }
}