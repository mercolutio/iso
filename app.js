// === Data Store (localStorage) ===
const STORE_KEY = 'qm_iso9001_data';

function loadData() {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
    return {
        documents: [],
        processes: [],
        audits: [],
        nonconformities: [],
        capa: [],
        risks: [],
        training: [],
        activities: [],
        parts: [],
        bom: [],
        counters: { doc: 0, proc: 0, audit: 0, nc: 0, capa: 0, risk: 0, part: 0, training: 0 }
    };
}

function saveData() {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

let data = loadData();

// === Navigation ===
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const pageTitle = document.getElementById('pageTitle');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');

const pageTitles = {
    dashboard: 'Dashboard',
    documents: 'Dokumentenlenkung',
    processes: 'Prozessmanagement',
    audits: 'Auditmanagement',
    nonconformities: 'Abweichungsmanagement',
    capa: 'CAPA - Korrektur- & Vorbeugemaßnahmen',
    risks: 'Risikomanagement',
    parts: 'Teile & ZSBs',
    training: 'Schulungsmanagement'
};

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById('page-' + page).classList.add('active');
        pageTitle.textContent = pageTitles[page] || page;
        sidebar.classList.remove('open');
    });
});

menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// === Modal helpers ===
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('active');
    const form = modal.querySelector('form');
    if (form) form.reset();
}

function confirm(title, message) {
    return new Promise(resolve => {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        openModal('confirmDialog');
        const btn = document.getElementById('confirmAction');
        const handler = () => {
            closeModal('confirmDialog');
            btn.removeEventListener('click', handler);
            resolve(true);
        };
        btn.addEventListener('click', handler);
    });
}

// === Activity Log ===
function addActivity(text) {
    data.activities.unshift({
        text,
        time: new Date().toLocaleString('de-DE')
    });
    if (data.activities.length > 50) data.activities.pop();
    saveData();
    renderActivities();
}

function renderActivities() {
    const list = document.getElementById('activityList');
    if (data.activities.length === 0) {
        list.innerHTML = '<li class="empty-state">Noch keine Aktivitäten vorhanden.</li>';
        return;
    }
    list.innerHTML = data.activities.slice(0, 15).map(a =>
        `<li>${escapeHtml(a.text)}<span class="activity-time">${escapeHtml(a.time)}</span></li>`
    ).join('');
}

// === Documents ===
function saveDocument(e) {
    e.preventDefault();
    data.counters.doc++;
    const doc = {
        id: data.counters.doc,
        number: 'DOK-' + String(data.counters.doc).padStart(3, '0'),
        title: document.getElementById('docTitle').value,
        type: document.getElementById('docType').value,
        version: document.getElementById('docVersion').value,
        chapter: document.getElementById('docChapter').value,
        description: document.getElementById('docDescription').value,
        status: 'Freigegeben',
        created: new Date().toISOString()
    };
    data.documents.push(doc);
    saveData();
    addActivity(`Dokument "${doc.title}" (${doc.number}) angelegt`);
    closeModal('documentModal');
    renderDocuments();
    updateKPIs();
}

function renderDocuments() {
    const tbody = document.querySelector('#documentsTable tbody');
    const typeFilter = document.getElementById('docFilterType').value;
    const search = document.getElementById('docSearch').value.toLowerCase();

    let docs = data.documents;
    if (typeFilter) docs = docs.filter(d => d.type === typeFilter);
    if (search) docs = docs.filter(d => d.title.toLowerCase().includes(search) || d.number.toLowerCase().includes(search));

    if (docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Keine Dokumente vorhanden.</td></tr>';
        return;
    }

    tbody.innerHTML = docs.map(d => `
        <tr>
            <td>${escapeHtml(d.number)}</td>
            <td>${escapeHtml(d.title)}</td>
            <td>${escapeHtml(d.type)}</td>
            <td>${escapeHtml(d.version)}</td>
            <td>${d.chapter || '-'}</td>
            <td><span class="status status-${statusClass(d.status)}">${escapeHtml(d.status)}</span></td>
            <td>
                <button class="btn-icon" title="Löschen" onclick="deleteDocument(${d.id})">&#128465;</button>
            </td>
        </tr>
    `).join('');
}

function deleteDocument(id) {
    confirm('Dokument löschen', 'Möchten Sie dieses Dokument wirklich löschen?').then(() => {
        const doc = data.documents.find(d => d.id === id);
        data.documents = data.documents.filter(d => d.id !== id);
        saveData();
        addActivity(`Dokument "${doc.title}" gelöscht`);
        renderDocuments();
        updateKPIs();
    });
}

document.getElementById('docFilterType').addEventListener('change', renderDocuments);
document.getElementById('docSearch').addEventListener('input', renderDocuments);

// === Processes ===
function saveProcess(e) {
    e.preventDefault();
    data.counters.proc++;
    const proc = {
        id: data.counters.proc,
        name: document.getElementById('processName').value,
        category: document.getElementById('processCategory').value,
        owner: document.getElementById('processOwner').value,
        inputs: document.getElementById('processInputs').value,
        outputs: document.getElementById('processOutputs').value,
        kpis: document.getElementById('processKPIs').value,
        created: new Date().toISOString()
    };
    data.processes.push(proc);
    saveData();
    addActivity(`Prozess "${proc.name}" angelegt`);
    closeModal('processModal');
    renderProcesses();
}

function renderProcesses() {
    const grid = document.getElementById('processGrid');
    if (data.processes.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:40px;">Keine Prozesse definiert. Legen Sie Ihren ersten Prozess an.</div>';
        return;
    }
    grid.innerHTML = data.processes.map(p => `
        <div class="process-card cat-${p.category.toLowerCase()}">
            <h4>${escapeHtml(p.name)}</h4>
            <div class="process-category">${escapeHtml(p.category)}</div>
            <div class="process-detail"><strong>Verantwortlich:</strong> ${escapeHtml(p.owner)}</div>
            ${p.inputs ? `<div class="process-detail"><strong>Eingaben:</strong> ${escapeHtml(p.inputs)}</div>` : ''}
            ${p.outputs ? `<div class="process-detail"><strong>Ergebnisse:</strong> ${escapeHtml(p.outputs)}</div>` : ''}
            ${p.kpis ? `<div class="process-detail"><strong>Kennzahlen:</strong> ${escapeHtml(p.kpis)}</div>` : ''}
            <div class="process-actions">
                <button class="btn btn-sm btn-danger" onclick="deleteProcess(${p.id})">Löschen</button>
            </div>
        </div>
    `).join('');
}

function deleteProcess(id) {
    confirm('Prozess löschen', 'Möchten Sie diesen Prozess wirklich löschen?').then(() => {
        const proc = data.processes.find(p => p.id === id);
        data.processes = data.processes.filter(p => p.id !== id);
        saveData();
        addActivity(`Prozess "${proc.name}" gelöscht`);
        renderProcesses();
    });
}

// === Audits ===
function saveAudit(e) {
    e.preventDefault();
    data.counters.audit++;
    const audit = {
        id: data.counters.audit,
        number: 'AUD-' + String(data.counters.audit).padStart(3, '0'),
        type: document.getElementById('auditType').value,
        area: document.getElementById('auditArea').value,
        date: document.getElementById('auditDate').value,
        auditor: document.getElementById('auditAuditor').value,
        notes: document.getElementById('auditNotes').value,
        status: 'Geplant',
        findings: 0,
        created: new Date().toISOString()
    };
    data.audits.push(audit);
    saveData();
    addActivity(`Audit ${audit.number} (${audit.type}) geplant`);
    closeModal('auditModal');
    renderAudits();
    updateKPIs();
}

function renderAudits() {
    const tbody = document.querySelector('#auditsTable tbody');
    if (data.audits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Keine Audits vorhanden.</td></tr>';
        return;
    }
    tbody.innerHTML = data.audits.map(a => `
        <tr>
            <td>${escapeHtml(a.number)}</td>
            <td>${escapeHtml(a.type)}</td>
            <td>${escapeHtml(a.area)}</td>
            <td>${formatDate(a.date)}</td>
            <td>${escapeHtml(a.auditor)}</td>
            <td>
                <select class="status-select" onchange="updateAuditStatus(${a.id}, this.value)">
                    <option value="Geplant" ${a.status === 'Geplant' ? 'selected' : ''}>Geplant</option>
                    <option value="Durchgeführt" ${a.status === 'Durchgeführt' ? 'selected' : ''}>Durchgeführt</option>
                    <option value="Abgeschlossen" ${a.status === 'Abgeschlossen' ? 'selected' : ''}>Abgeschlossen</option>
                </select>
            </td>
            <td>${a.findings}</td>
            <td>
                <button class="btn-icon" title="Löschen" onclick="deleteAudit(${a.id})">&#128465;</button>
            </td>
        </tr>
    `).join('');
}

function updateAuditStatus(id, status) {
    const audit = data.audits.find(a => a.id === id);
    audit.status = status;
    saveData();
    addActivity(`Audit ${audit.number} Status: ${status}`);
    updateKPIs();
}

function deleteAudit(id) {
    confirm('Audit löschen', 'Möchten Sie dieses Audit wirklich löschen?').then(() => {
        const audit = data.audits.find(a => a.id === id);
        data.audits = data.audits.filter(a => a.id !== id);
        saveData();
        addActivity(`Audit ${audit.number} gelöscht`);
        renderAudits();
        updateKPIs();
    });
}

// === Nonconformities ===
function saveNC(e) {
    e.preventDefault();
    data.counters.nc++;
    const nc = {
        id: data.counters.nc,
        number: 'NC-' + String(data.counters.nc).padStart(3, '0'),
        description: document.getElementById('ncDescription').value,
        area: document.getElementById('ncArea').value,
        severity: document.getElementById('ncSeverity').value,
        immediate: document.getElementById('ncImmediate').value,
        source: document.getElementById('ncSource').value,
        status: 'Offen',
        created: new Date().toISOString()
    };
    data.nonconformities.push(nc);
    saveData();
    addActivity(`Abweichung ${nc.number} (${nc.severity}) erfasst`);
    closeModal('ncModal');
    renderNCs();
    updateKPIs();
}

function renderNCs() {
    const tbody = document.querySelector('#ncTable tbody');
    const sevFilter = document.getElementById('ncFilterSeverity').value;
    const statusFilter = document.getElementById('ncFilterStatus').value;

    let ncs = data.nonconformities;
    if (sevFilter) ncs = ncs.filter(n => n.severity === sevFilter);
    if (statusFilter) ncs = ncs.filter(n => n.status === statusFilter);

    if (ncs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Keine Abweichungen vorhanden.</td></tr>';
        return;
    }
    tbody.innerHTML = ncs.map(n => `
        <tr>
            <td>${escapeHtml(n.number)}</td>
            <td title="${escapeHtml(n.description)}">${escapeHtml(n.description)}</td>
            <td>${escapeHtml(n.area)}</td>
            <td><span class="status severity-${n.severity.toLowerCase()}">${escapeHtml(n.severity)}</span></td>
            <td title="${escapeHtml(n.immediate)}">${escapeHtml(n.immediate || '-')}</td>
            <td>
                <select class="status-select" onchange="updateNCStatus(${n.id}, this.value)">
                    <option value="Offen" ${n.status === 'Offen' ? 'selected' : ''}>Offen</option>
                    <option value="In Bearbeitung" ${n.status === 'In Bearbeitung' ? 'selected' : ''}>In Bearbeitung</option>
                    <option value="Abgeschlossen" ${n.status === 'Abgeschlossen' ? 'selected' : ''}>Abgeschlossen</option>
                </select>
            </td>
            <td>
                <button class="btn-icon" title="Löschen" onclick="deleteNC(${n.id})">&#128465;</button>
            </td>
        </tr>
    `).join('');
}

function updateNCStatus(id, status) {
    const nc = data.nonconformities.find(n => n.id === id);
    nc.status = status;
    saveData();
    addActivity(`Abweichung ${nc.number} Status: ${status}`);
    updateKPIs();
}

function deleteNC(id) {
    confirm('Abweichung löschen', 'Möchten Sie diese Abweichung wirklich löschen?').then(() => {
        const nc = data.nonconformities.find(n => n.id === id);
        data.nonconformities = data.nonconformities.filter(n => n.id !== id);
        saveData();
        addActivity(`Abweichung ${nc.number} gelöscht`);
        renderNCs();
        updateKPIs();
    });
}

document.getElementById('ncFilterSeverity').addEventListener('change', renderNCs);
document.getElementById('ncFilterStatus').addEventListener('change', renderNCs);

// === CAPA ===
function saveCapa(e) {
    e.preventDefault();
    data.counters.capa++;
    const capa = {
        id: data.counters.capa,
        number: 'CAPA-' + String(data.counters.capa).padStart(3, '0'),
        type: document.getElementById('capaType').value,
        reference: document.getElementById('capaReference').value,
        rootCause: document.getElementById('capaRootCause').value,
        action: document.getElementById('capaAction').value,
        responsible: document.getElementById('capaResponsible').value,
        dueDate: document.getElementById('capaDueDate').value,
        effectiveness: document.getElementById('capaEffectiveness').value,
        status: 'Offen',
        created: new Date().toISOString()
    };
    data.capa.push(capa);
    saveData();
    addActivity(`CAPA ${capa.number} (${capa.type}) angelegt`);
    closeModal('capaModal');
    renderCapas();
    updateKPIs();
}

function renderCapas() {
    const tbody = document.querySelector('#capaTable tbody');
    if (data.capa.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Keine CAPA vorhanden.</td></tr>';
        return;
    }
    tbody.innerHTML = data.capa.map(c => `
        <tr>
            <td>${escapeHtml(c.number)}</td>
            <td>${escapeHtml(c.type)}</td>
            <td>${escapeHtml(c.reference || '-')}</td>
            <td title="${escapeHtml(c.rootCause)}">${escapeHtml(c.rootCause)}</td>
            <td title="${escapeHtml(c.action)}">${escapeHtml(c.action)}</td>
            <td>${escapeHtml(c.responsible)}</td>
            <td>${formatDate(c.dueDate)}</td>
            <td>
                <select class="status-select" onchange="updateCapaStatus(${c.id}, this.value)">
                    <option value="Offen" ${c.status === 'Offen' ? 'selected' : ''}>Offen</option>
                    <option value="In Bearbeitung" ${c.status === 'In Bearbeitung' ? 'selected' : ''}>In Bearbeitung</option>
                    <option value="Wirksamkeitsprüfung" ${c.status === 'Wirksamkeitsprüfung' ? 'selected' : ''}>Wirksamkeitsprüfung</option>
                    <option value="Abgeschlossen" ${c.status === 'Abgeschlossen' ? 'selected' : ''}>Abgeschlossen</option>
                </select>
            </td>
            <td>
                <button class="btn-icon" title="Löschen" onclick="deleteCapa(${c.id})">&#128465;</button>
            </td>
        </tr>
    `).join('');
}

function updateCapaStatus(id, status) {
    const capa = data.capa.find(c => c.id === id);
    capa.status = status;
    saveData();
    addActivity(`CAPA ${capa.number} Status: ${status}`);
    updateKPIs();
}

function deleteCapa(id) {
    confirm('CAPA löschen', 'Möchten Sie diese CAPA wirklich löschen?').then(() => {
        const capa = data.capa.find(c => c.id === id);
        data.capa = data.capa.filter(c => c.id !== id);
        saveData();
        addActivity(`CAPA ${capa.number} gelöscht`);
        renderCapas();
        updateKPIs();
    });
}

// === Risks ===
function saveRisk(e) {
    e.preventDefault();
    data.counters.risk++;
    const prob = parseInt(document.getElementById('riskProbability').value);
    const impact = parseInt(document.getElementById('riskImpact').value);
    const risk = {
        id: data.counters.risk,
        number: 'R-' + String(data.counters.risk).padStart(3, '0'),
        description: document.getElementById('riskDescription').value,
        process: document.getElementById('riskProcess').value,
        probability: prob,
        impact: impact,
        rpz: prob * impact,
        mitigation: document.getElementById('riskMitigation').value,
        status: 'Aktiv',
        created: new Date().toISOString()
    };
    data.risks.push(risk);
    saveData();
    addActivity(`Risiko ${risk.number} (RPZ: ${risk.rpz}) erfasst`);
    closeModal('riskModal');
    renderRisks();
    renderRiskMatrix();
    updateKPIs();
}

function renderRisks() {
    const tbody = document.querySelector('#risksTable tbody');
    if (data.risks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Keine Risiken erfasst.</td></tr>';
        return;
    }
    tbody.innerHTML = data.risks.map(r => `
        <tr>
            <td>${escapeHtml(r.number)}</td>
            <td title="${escapeHtml(r.description)}">${escapeHtml(r.description)}</td>
            <td>${escapeHtml(r.process || '-')}</td>
            <td>${r.probability}</td>
            <td>${r.impact}</td>
            <td><strong class="${r.rpz >= 15 ? 'text-danger' : r.rpz >= 8 ? 'text-warning' : ''}">${r.rpz}</strong></td>
            <td title="${escapeHtml(r.mitigation)}">${escapeHtml(r.mitigation || '-')}</td>
            <td>
                <select class="status-select" onchange="updateRiskStatus(${r.id}, this.value)">
                    <option value="Aktiv" ${r.status === 'Aktiv' ? 'selected' : ''}>Aktiv</option>
                    <option value="Überwacht" ${r.status === 'Überwacht' ? 'selected' : ''}>Überwacht</option>
                    <option value="Geschlossen" ${r.status === 'Geschlossen' ? 'selected' : ''}>Geschlossen</option>
                </select>
            </td>
            <td>
                <button class="btn-icon" title="Löschen" onclick="deleteRisk(${r.id})">&#128465;</button>
            </td>
        </tr>
    `).join('');
}

function renderRiskMatrix() {
    const grid = document.querySelector('.matrix-grid');
    grid.innerHTML = '';

    // Build 5x5 matrix (impact 5 at top, probability 1-5 left to right)
    for (let impact = 5; impact >= 1; impact--) {
        for (let prob = 1; prob <= 5; prob++) {
            const rpz = prob * impact;
            const count = data.risks.filter(r => r.probability === prob && r.impact === impact && r.status !== 'Geschlossen').length;

            let riskLevel = 'risk-low';
            if (rpz >= 15) riskLevel = 'risk-critical';
            else if (rpz >= 8) riskLevel = 'risk-high';
            else if (rpz >= 4) riskLevel = 'risk-medium';

            const cell = document.createElement('div');
            cell.className = `matrix-cell ${riskLevel}`;
            cell.title = `W:${prob} x A:${impact} = ${rpz}`;
            cell.innerHTML = count > 0 ? `<span class="risk-count">${count}</span>` : `${rpz}`;
            grid.appendChild(cell);
        }
    }
}

function updateRiskStatus(id, status) {
    const risk = data.risks.find(r => r.id === id);
    risk.status = status;
    saveData();
    addActivity(`Risiko ${risk.number} Status: ${status}`);
    renderRiskMatrix();
    updateKPIs();
}

function deleteRisk(id) {
    confirm('Risiko löschen', 'Möchten Sie dieses Risiko wirklich löschen?').then(() => {
        const risk = data.risks.find(r => r.id === id);
        data.risks = data.risks.filter(r => r.id !== id);
        saveData();
        addActivity(`Risiko ${risk.number} gelöscht`);
        renderRisks();
        renderRiskMatrix();
        updateKPIs();
    });
}

// === Parts & ZSBs ===
let selectedZsbId = null;

function savePart(e) {
    e.preventDefault();
    data.counters.part++;
    // Ensure arrays exist (migration for old data)
    if (!data.parts) data.parts = [];
    if (!data.bom) data.bom = [];
    const part = {
        id: data.counters.part,
        number: document.getElementById('partNumber').value,
        name: document.getElementById('partName').value,
        type: document.getElementById('partType').value,
        drawing: document.getElementById('partDrawing').value,
        revision: document.getElementById('partRevision').value,
        material: document.getElementById('partMaterial').value,
        weight: document.getElementById('partWeight').value,
        supplier: document.getElementById('partSupplier').value,
        customerNumber: document.getElementById('partCustomerNumber').value,
        notes: document.getElementById('partNotes').value,
        status: 'Aktiv',
        created: new Date().toISOString()
    };
    data.parts.push(part);
    saveData();
    addActivity(`Teil "${part.name}" (${part.number}, ${part.type}) angelegt`);
    closeModal('partModal');
    renderParts();
    updateKPIs();
}

function renderParts() {
    if (!data.parts) data.parts = [];
    const tbody = document.querySelector('#partsTable tbody');
    const typeFilter = document.getElementById('partFilterType').value;
    const statusFilter = document.getElementById('partFilterStatus').value;
    const search = document.getElementById('partSearch').value.toLowerCase();

    let parts = data.parts;
    if (typeFilter) parts = parts.filter(p => p.type === typeFilter);
    if (statusFilter) parts = parts.filter(p => p.status === statusFilter);
    if (search) parts = parts.filter(p =>
        p.number.toLowerCase().includes(search) ||
        p.name.toLowerCase().includes(search) ||
        (p.customerNumber && p.customerNumber.toLowerCase().includes(search))
    );

    if (parts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Keine Teile vorhanden.</td></tr>';
        return;
    }

    tbody.innerHTML = parts.map(p => `
        <tr>
            <td><strong>${escapeHtml(p.number)}</strong></td>
            <td>${escapeHtml(p.name)}</td>
            <td><span class="part-type part-type-${p.type.toLowerCase().replace(/[^a-z]/g, '')}">${escapeHtml(p.type)}</span></td>
            <td>${escapeHtml(p.drawing || '-')}${p.revision ? ' Rev.' + escapeHtml(p.revision) : ''}</td>
            <td>${escapeHtml(p.material || '-')}</td>
            <td>${escapeHtml(p.supplier || '-')}</td>
            <td>
                <select class="status-select" onchange="updatePartStatus(${p.id}, this.value)">
                    <option value="Aktiv" ${p.status === 'Aktiv' ? 'selected' : ''}>Aktiv</option>
                    <option value="Gesperrt" ${p.status === 'Gesperrt' ? 'selected' : ''}>Gesperrt</option>
                    <option value="Auslaufend" ${p.status === 'Auslaufend' ? 'selected' : ''}>Auslaufend</option>
                    <option value="Prototyp" ${p.status === 'Prototyp' ? 'selected' : ''}>Prototyp</option>
                </select>
            </td>
            <td>
                ${p.type === 'ZSB' ? `<button class="btn-icon" title="Stückliste" onclick="showBom(${p.id})">&#128196;</button>` : ''}
                <button class="btn-icon" title="Löschen" onclick="deletePart(${p.id})">&#128465;</button>
            </td>
        </tr>
    `).join('');
}

function updatePartStatus(id, status) {
    const part = data.parts.find(p => p.id === id);
    part.status = status;
    saveData();
    addActivity(`Teil ${part.number} Status: ${status}`);
    updateKPIs();
}

function deletePart(id) {
    confirm('Teil löschen', 'Möchten Sie dieses Teil wirklich löschen? Stücklisten-Einträge werden ebenfalls entfernt.').then(() => {
        const part = data.parts.find(p => p.id === id);
        data.parts = data.parts.filter(p => p.id !== id);
        if (!data.bom) data.bom = [];
        data.bom = data.bom.filter(b => b.zsbId !== id && b.partId !== id);
        if (selectedZsbId === id) {
            selectedZsbId = null;
            document.getElementById('bomSection').style.display = 'none';
        }
        saveData();
        addActivity(`Teil "${part.name}" (${part.number}) gelöscht`);
        renderParts();
        updateKPIs();
    });
}

function showBom(zsbId) {
    if (!data.bom) data.bom = [];
    selectedZsbId = zsbId;
    const zsb = data.parts.find(p => p.id === zsbId);
    document.getElementById('bomTitle').textContent = `Stückliste: ${zsb.name} (${zsb.number})`;
    document.getElementById('bomSection').style.display = 'block';
    populateBomSelect();
    renderBom();
    document.getElementById('bomSection').scrollIntoView({ behavior: 'smooth' });
}

function populateBomSelect() {
    const sel = document.getElementById('bomPartSelect');
    if (!data.bom) data.bom = [];
    const existingIds = data.bom.filter(b => b.zsbId === selectedZsbId).map(b => b.partId);
    const available = data.parts.filter(p => p.id !== selectedZsbId && !existingIds.includes(p.id));
    sel.innerHTML = '<option value="">Bitte wählen</option>' +
        available.map(p => `<option value="${p.id}">${escapeHtml(p.number)} - ${escapeHtml(p.name)} (${escapeHtml(p.type)})</option>`).join('');
}

function saveBomEntry(e) {
    e.preventDefault();
    if (!data.bom) data.bom = [];
    const entry = {
        zsbId: selectedZsbId,
        partId: parseInt(document.getElementById('bomPartSelect').value),
        quantity: parseInt(document.getElementById('bomQuantity').value),
        unit: document.getElementById('bomUnit').value
    };
    data.bom.push(entry);
    saveData();
    const part = data.parts.find(p => p.id === entry.partId);
    const zsb = data.parts.find(p => p.id === selectedZsbId);
    addActivity(`${part.number} zu Stückliste ${zsb.number} hinzugefügt (${entry.quantity} ${entry.unit})`);
    closeModal('bomModal');
    populateBomSelect();
    renderBom();
}

function renderBom() {
    if (!data.bom) data.bom = [];
    const tbody = document.querySelector('#bomTable tbody');
    const entries = data.bom.filter(b => b.zsbId === selectedZsbId);

    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Stückliste ist leer. Ordnen Sie Teile zu.</td></tr>';
        return;
    }

    tbody.innerHTML = entries.map((b, i) => {
        const part = data.parts.find(p => p.id === b.partId);
        if (!part) return '';
        return `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(part.number)}</strong></td>
            <td>${escapeHtml(part.name)}</td>
            <td>${b.quantity}</td>
            <td>${escapeHtml(b.unit)}</td>
            <td>
                <button class="btn-icon" title="Entfernen" onclick="removeBomEntry(${selectedZsbId}, ${b.partId})">&#128465;</button>
            </td>
        </tr>`;
    }).join('');
}

function removeBomEntry(zsbId, partId) {
    data.bom = data.bom.filter(b => !(b.zsbId === zsbId && b.partId === partId));
    saveData();
    addActivity('Teil aus Stückliste entfernt');
    populateBomSelect();
    renderBom();
}

document.getElementById('partFilterType').addEventListener('change', renderParts);
document.getElementById('partFilterStatus').addEventListener('change', renderParts);
document.getElementById('partSearch').addEventListener('input', renderParts);

// === Training ===
function saveTraining(e) {
    e.preventDefault();
    data.counters.training++;
    const training = {
        id: data.counters.training,
        number: 'S-' + String(data.counters.training).padStart(3, '0'),
        topic: document.getElementById('trainingTopic').value,
        participants: document.getElementById('trainingParticipants').value,
        date: document.getElementById('trainingDate').value,
        trainer: document.getElementById('trainingTrainer').value,
        content: document.getElementById('trainingContent').value,
        status: 'Ausstehend',
        created: new Date().toISOString()
    };
    data.training.push(training);
    saveData();
    addActivity(`Schulung "${training.topic}" (${training.number}) angelegt`);
    closeModal('trainingModal');
    renderTraining();
    updateKPIs();
}

function renderTraining() {
    const tbody = document.querySelector('#trainingTable tbody');
    if (data.training.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Keine Schulungen vorhanden.</td></tr>';
        return;
    }
    tbody.innerHTML = data.training.map(t => `
        <tr>
            <td>${escapeHtml(t.number)}</td>
            <td>${escapeHtml(t.topic)}</td>
            <td title="${escapeHtml(t.participants)}">${escapeHtml(t.participants)}</td>
            <td>${formatDate(t.date)}</td>
            <td>${escapeHtml(t.trainer)}</td>
            <td>
                <select class="status-select" onchange="updateTrainingStatus(${t.id}, this.value)">
                    <option value="Ausstehend" ${t.status === 'Ausstehend' ? 'selected' : ''}>Ausstehend</option>
                    <option value="Durchgeführt" ${t.status === 'Durchgeführt' ? 'selected' : ''}>Durchgeführt</option>
                    <option value="Abgeschlossen" ${t.status === 'Abgeschlossen' ? 'selected' : ''}>Abgeschlossen</option>
                </select>
            </td>
            <td>
                <button class="btn-icon" title="Löschen" onclick="deleteTraining(${t.id})">&#128465;</button>
            </td>
        </tr>
    `).join('');
}

function updateTrainingStatus(id, status) {
    const t = data.training.find(t => t.id === id);
    t.status = status;
    saveData();
    addActivity(`Schulung ${t.number} Status: ${status}`);
    updateKPIs();
}

function deleteTraining(id) {
    confirm('Schulung löschen', 'Möchten Sie diese Schulung wirklich löschen?').then(() => {
        const t = data.training.find(t => t.id === id);
        data.training = data.training.filter(t => t.id !== id);
        saveData();
        addActivity(`Schulung ${t.number} gelöscht`);
        renderTraining();
        updateKPIs();
    });
}

// === KPIs ===
function updateKPIs() {
    document.getElementById('kpiDocuments').textContent = data.documents.length;
    document.getElementById('kpiAudits').textContent = data.audits.filter(a => a.status === 'Geplant').length;

    const openNCs = data.nonconformities.filter(n => n.status !== 'Abgeschlossen').length;
    document.getElementById('kpiNC').textContent = openNCs;
    document.getElementById('openIssuesBadge').textContent = openNCs;

    document.getElementById('kpiCapa').textContent = data.capa.filter(c => c.status !== 'Abgeschlossen').length;
    document.getElementById('kpiHighRisks').textContent = data.risks.filter(r => r.rpz >= 15 && r.status !== 'Geschlossen').length;
    document.getElementById('kpiParts').textContent = (data.parts || []).length;
    document.getElementById('kpiTraining').textContent = data.training.filter(t => t.status === 'Ausstehend').length;
}

// === Helpers ===
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE');
}

function statusClass(status) {
    return status.toLowerCase().replace(/\s+/g, '-');
}

// === Initialize ===
function init() {
    renderActivities();
    renderDocuments();
    renderProcesses();
    renderAudits();
    renderNCs();
    renderCapas();
    renderRisks();
    renderRiskMatrix();
    renderParts();
    renderTraining();
    updateKPIs();
}

init();
