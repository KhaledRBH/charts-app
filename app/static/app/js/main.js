const QUERY_ID = "{{ selected_id }}";
const CONDITION = "{{ condition|escapejs }}";

document.addEventListener("DOMContentLoaded", () => {
  const table = document.getElementById("data-table");
  if (!table) return;

  const tbody = table.querySelector("tbody");
  const container = document.querySelector(".table-container");

  // ---------------- CACHE ALL ROWS ----------------
  let allRows = Array.from(tbody.querySelectorAll("tr"));

  function syncRows() {
    allRows = Array.from(tbody.querySelectorAll("tr"));
  }

  // ---------------- GLOBAL VARIABLES FOR FILTERS ----------------
  const checkboxStates = [];
  let sortColumn = null;
  let sortDirection = 1;

  // ---------------- COLUMN FILTERS ----------------
  function initFilters() {
    const colCount = table.querySelectorAll("th").length;
    const valuesPerCol = Array.from({ length: colCount }, () => new Set());

    // Collect all unique values for each column
    allRows.forEach(row => {
      [...row.children].forEach((cell, i) => {
        valuesPerCol[i].add(cell.textContent.trim() || "(empty)");
      });
    });

    // Initialize checkboxStates for each column
    for (let i = 0; i < colCount; i++) {
      checkboxStates[i] = {};
      const values = [...valuesPerCol[i]].sort();
      values.forEach(val => {
        checkboxStates[i][val] = true;
      });
    }

    // Create filter UI for each column
    document.querySelectorAll(".filter-menu").forEach(menu => {
      const col = +menu.dataset.col;
      const opt = menu.querySelector(".filter-options");
      opt.innerHTML = "";

      // Search input
      const search = document.createElement("input");
      search.type = "text";
      search.placeholder = "Search...";
      search.className = "filter-search";
      opt.appendChild(search);

      const list = document.createElement("div");
      opt.appendChild(list);

      // Select All checkbox
      const selectAllLabel = document.createElement("label");
      const selectAllCb = document.createElement("input");
      selectAllCb.type = "checkbox";
      selectAllCb.checked = true;
      selectAllLabel.appendChild(selectAllCb);
      selectAllLabel.appendChild(document.createTextNode(" Select All"));
      list.appendChild(selectAllLabel);

      function renderCheckboxes(searchTerm = "") {
        list.innerHTML = "";
        list.appendChild(selectAllLabel);

        const allValues = Object.keys(checkboxStates[col]).sort();
        const filteredValues = allValues.filter(val => 
          val.toLowerCase().includes(searchTerm.toLowerCase())
        );

        filteredValues.forEach(val => {
          const label = document.createElement("label");
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = checkboxStates[col][val];
          cb.value = val;
          label.append(cb, document.createTextNode(" " + val));
          list.appendChild(label);

          cb.addEventListener("change", () => {
            checkboxStates[col][val] = cb.checked;
            updateSelectAllState();
            applyFilter();
          });
        });

        updateSelectAllState();
      }

      function updateSelectAllState() {
        const allValues = Object.keys(checkboxStates[col]);
        const allChecked = allValues.every(val => checkboxStates[col][val]);
        selectAllCb.checked = allChecked;
      }

      selectAllCb.addEventListener("change", () => {
        const allValues = Object.keys(checkboxStates[col]);
        allValues.forEach(val => {
          checkboxStates[col][val] = selectAllCb.checked;
        });
        renderCheckboxes(search.value);
        applyFilter();
      });

      search.addEventListener("input", (e) => {
        renderCheckboxes(e.target.value);
      });

      renderCheckboxes();
    });
  }

  // ---------------- APPLY FILTER ----------------
  function applyFilter() {
    const rules = [];

    checkboxStates.forEach((states, colIndex) => {
      if (!states) return;
      
      const checkedValues = Object.entries(states)
        .filter(([val, checked]) => checked)
        .map(([val]) => val);
      rules[colIndex] = checkedValues.length ? checkedValues : null;
    });

    allRows.forEach(row => {
      const visible = [...row.children].every((cell, i) => {
        const value = cell.textContent.trim() || "(empty)";
        return rules[i] === null || rules[i].includes(value);
      });
      row.style.display = visible ? "" : "none";
    });
    
    // Update export status
    updateExportStatus();
  }

  // ---------------- GET FILTERED DATA ----------------
  function getFilteredData() {
    const data = [];
    
    // Get column headers
    const headers = Array.from(table.querySelectorAll("th")).map(th => 
      th.querySelector("span").textContent.trim()
    );
    data.push(headers);
    
    // Get filtered rows
    allRows.forEach(row => {
      if (row.style.display !== "none") {
        const rowData = Array.from(row.querySelectorAll("td")).map(td => 
          td.textContent.trim()
        );
        data.push(rowData);
      }
    });
    
    return data;
  }

  // ---------------- EXPORT TO CSV ----------------
  function exportToCSV() {
    const data = getFilteredData();
    const csvContent = data.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (/[",\n]/.test(cell)) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `query_${QUERY_ID}_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    document.getElementById("export-status").textContent = `Exported ${data.length - 1} rows to CSV`;
    document.getElementById("export-status").style.color = "#28a745";
  }

  // ---------------- EXPORT TO EXCEL ----------------
  function exportToExcel() {
    // Alternative: Export as CSV with .xls extension (opens in Excel)
    const data = getFilteredData();
    const csvContent = data.map(row => 
      row.map(cell => {
        if (/[",\n\t]/.test(cell)) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join('\t')
    ).join('\n');
    
    // Add UTF-8 BOM for Excel compatibility
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `query_${QUERY_ID}_export_${new Date().toISOString().slice(0,10)}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    document.getElementById("export-status").textContent = `Exported ${data.length - 1} rows to Excel`;
    document.getElementById("export-status").style.color = "#17a2b8";
  }

  // ---------------- UPDATE EXPORT STATUS ----------------
  function updateExportStatus() {
    const visibleRows = allRows.filter(row => row.style.display !== "none").length;
    const statusEl = document.getElementById("export-status");
    if (statusEl) {
      if (visibleRows === allRows.length) {
        statusEl.textContent = `${visibleRows} rows (all visible)`;
      } else {
        statusEl.textContent = `${visibleRows} rows (filtered from ${allRows.length})`;
      }
      statusEl.style.color = visibleRows < allRows.length ? "#ff9800" : "#28a745";
    }
  }

  // ---------------- ADD SORTING FUNCTIONALITY ----------------
  function addSorting() {
    const headers = table.querySelectorAll("th");
    headers.forEach((header, index) => {
      const span = header.querySelector("span");
      header.style.cursor = "pointer";
      header.title = "Click to sort";
      
      header.addEventListener("click", () => {
        // Update sort indicators
        headers.forEach(h => {
          const hSpan = h.querySelector("span");
          hSpan.textContent = hSpan.textContent.replace(/ [↑↓]$/, '');
        });
        
        if (sortColumn === index) {
          sortDirection = -sortDirection;
        } else {
          sortColumn = index;
          sortDirection = 1;
        }
        
        span.textContent = span.textContent + (sortDirection === 1 ? ' ↑' : ' ↓');
        sortTable(index);
      });
    });
  }

  function sortTable(columnIndex) {
    const rows = Array.from(tbody.querySelectorAll("tr"));
    
    rows.sort((a, b) => {
      const aVal = a.children[columnIndex].textContent.trim();
      const bVal = b.children[columnIndex].textContent.trim();
      
      // Try numeric comparison
      const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
      const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ''));
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return (aNum - bNum) * sortDirection;
      }
      
      // String comparison
      return aVal.localeCompare(bVal) * sortDirection;
    });
    
    // Reorder in DOM
    const fragment = document.createDocumentFragment();
    rows.forEach(row => fragment.appendChild(row));
    tbody.appendChild(fragment);
    syncRows();
  }

  // ---------------- FILTER MENU TOGGLE ----------------
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      document.querySelectorAll(".filter-menu").forEach(m => m.classList.remove("active"));
      btn.nextElementSibling.classList.toggle("active");
    });
  });

  document.addEventListener("click", (e) => {
    document.querySelectorAll(".filter-menu").forEach(menu => {
      const filterBtn = menu.previousElementSibling;
      if (!menu.contains(e.target) && !filterBtn.contains(e.target)) {
        menu.classList.remove("active");
      }
    });
  });

  // ---------------- EXPORT BUTTON LISTENERS ----------------
  const exportCsvBtn = document.getElementById("export-csv-btn");
  const exportExcelBtn = document.getElementById("export-excel-btn");
  
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", exportToCSV);
  }
  
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", exportToExcel);
  }

  // ---------------- INITIALIZE ----------------
  initFilters();
  addSorting();
  updateExportStatus();

  // ---------------- INFINITE SCROLL ----------------
  let offset = allRows.length;
  const limit = 200;
  let loading = false;

  async function loadMore() {
    if (loading || !QUERY_ID) return;
    loading = true;

    try {
      const res = await fetch(
        `{% url 'load_more_query_rows' %}?query_id=${QUERY_ID}&condition=${encodeURIComponent(CONDITION)}&offset=${offset}&limit=${limit}`
      );
      const data = await res.json();

      if (data.rows && data.rows.length) {
        data.rows.forEach(r => {
          const tr = document.createElement("tr");
          r.forEach(c => {
            const td = document.createElement("td");
            td.textContent = c ?? "";
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });

        syncRows();
        initFilters();
        applyFilter();
        updateExportStatus();
        offset += data.rows.length;
      }
    } catch (err) {
      console.error(err);
    }
    loading = false;
  }

  if (container) {
    container.addEventListener("scroll", () => {
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 150) {
        loadMore();
      }
    });
  }
});