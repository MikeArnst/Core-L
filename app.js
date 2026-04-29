// --- DATA STRUCTURE V6 (Units) ---
let appData = { activeProjectId: 0, lastPracticeDate: "", streak: 0, projects: [] };
let trainingQueue = [];
let currentCardInfo = null;
let currentSequenceStep = 0;
let isSequenceActive = false;
let cooldownQueue = [];
let isSelectMode = false; let selectedIndices = new Set();
let direction = 0;
let activeUnitId = null;
let isDuplicateFilterActive = false;
let editProjectIndex = -1;
let editUnitIndex = -1;

document.addEventListener('DOMContentLoaded', () => { loadData(); });

function loadData() {
try {
const data = localStorage.getItem('core_l_data_v2');
if (data) { appData = JSON.parse(data); }
if (!appData.projects) appData.projects = [];
if (appData.projects.length === 0) appData.projects.push({ name: "Demo Projekt", units: [{name:"Allgemein", words:[]}] });
migrateToV6();
checkStreakLogic();
showProjects();
} catch(e) {
console.error(e);
alert("Datenfehler. Reset.");
localStorage.removeItem('core_l_data_v2');
location.reload();
}
}

function migrateToV6() {
let migrated = false;
appData.projects.forEach(p => {
if (p.words && !p.units) {
p.units = [];
if (p.words.length > 0) {
p.units.push({ name: "Allgemein", words: p.words });
} else {
p.units.push({ name: "Allgemein", words: [] });
}
delete p.words;
migrated = true;
}
if (!p.units) p.units = [{ name: "Allgemein", words: [] }];
});
if (migrated) save();
}

function save() { localStorage.setItem('core_l_data_v2', JSON.stringify(appData)); }

function checkStreakLogic() {
const today = new Date().toDateString();
if (appData.lastPracticeDate !== today) {
const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
if (appData.lastPracticeDate !== yesterday.toDateString()) appData.streak = 0;
}
}

function updateStreak() {
const today = new Date().toDateString();
if (appData.lastPracticeDate !== today) {
appData.streak = (appData.streak || 0) + 1;
appData.lastPracticeDate = today;
save();
}
}

function cleanString(str) { return str ? str.trim().toLowerCase().replace(/[.,?!]/g, '').replace(/\s+/g, ' ') : ""; }
function cleanDisplay(str) { return str ? str.trim() : ""; }

// --- NAVIGATION ---
function switchTab(tab) {
document.querySelectorAll('.container').forEach(el => el.classList.add('hidden'));
if(tab === 'projects') document.getElementById('view-projects').classList.remove('hidden');
if(tab === 'project-overview') {
document.getElementById('view-project-overview').classList.remove('hidden');
renderProjectOverview();
}
if(tab === 'unit-details') {
document.getElementById('view-unit-details').classList.remove('hidden');
renderUnitDetails();
}
if(tab === 'listManager') {
document.getElementById('view-list-manager').classList.remove('hidden');
initDBFilters();
renderList();
}
if(tab === 'test') document.getElementById('view-test').classList.remove('hidden');
if(tab === 'guide') document.getElementById('view-guide').classList.remove('hidden');
}

function showProjects() {
activeUnitId = null;
switchTab('projects');
const c = document.getElementById('project-list-container'); c.innerHTML = '';
appData.projects.forEach((p, i) => {
const div = document.createElement('div'); div.className = 'project-card';
div.innerHTML = `<span class="project-name">📂 ${p.name}</span>`;
div.onclick = () => openProject(i);
const editBtn = document.createElement('button');
editBtn.innerText = "⚙️";
editBtn.className = "btn-icon";
editBtn.onclick=(e)=>{e.stopPropagation(); openProjectEditModal(i)};
div.appendChild(editBtn);
c.appendChild(div);
});
}

function openProjectEditModal(index) {
editProjectIndex = index;
document.getElementById('edit-project-name-input').value = appData.projects[index].name;
document.getElementById('project-edit-modal').classList.remove('hidden');
}
function closeProjectEditModal() {
document.getElementById('project-edit-modal').classList.add('hidden');
}
function saveProjectName() {
const newName = document.getElementById('edit-project-name-input').value.trim();
if(newName) {
appData.projects[editProjectIndex].name = newName;
save();
closeProjectEditModal();
showProjects();
} else {
alert("Name darf nicht leer sein.");
}
}
function deleteProjectFromModal() {
if(confirm(`Projekt "${appData.projects[editProjectIndex].name}" wirklich löschen?`)) {
appData.projects.splice(editProjectIndex, 1);
save();
closeProjectEditModal();
showProjects();
}
}
function moveProject(direction) {
const newIndex = editProjectIndex + direction;
if(newIndex >= 0 && newIndex < appData.projects.length) {
const temp = appData.projects[editProjectIndex];
appData.projects[editProjectIndex] = appData.projects[newIndex];
appData.projects[newIndex] = temp;
editProjectIndex = newIndex;
save();
showProjects();
}
}

function createNewProject() {
const name = document.getElementById('new-project-name').value.trim();
if(!name) return;
appData.projects.push({ name: name, units: [{name:"Allgemein", words:[]}] });
save(); document.getElementById('new-project-name').value=''; showProjects();
}

function openProject(i) {
appData.activeProjectId = i;
activeUnitId = null;
switchTab('project-overview');
}

// --- STATS CALCULATION (SPLIT) ---
function updateProjectStats() {
const p = appData.projects[appData.activeProjectId];
document.getElementById('global-streak-count').innerText = appData.streak || 0;
// Calculate total words and total score across ALL units
let totalWords = 0;
let totalPoints = 0;
p.units.forEach(u => {
totalWords += u.words.length;
u.words.forEach(w => {
totalPoints += (w.box || 0);
});
});
const maxPoints = totalWords * 5;
const percent = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
document.getElementById('global-mastery-percent').innerText = percent;
}

function updateUnitStats() {
const p = appData.projects[appData.activeProjectId];
const u = p.units[activeUnitId];
const list = u.words;
if(!list || list.length === 0) {
document.getElementById('unit-mastery-percent').innerText = "0";
} else {
let totalPoints = 0;
let maxPoints = list.length * 5;
list.forEach(w => { totalPoints += (w.box || 0); });
let percent = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
document.getElementById('unit-mastery-percent').innerText = percent;
}
}

// --- PROJECT OVERVIEW ---
function renderProjectOverview() {
const p = appData.projects[appData.activeProjectId];
document.getElementById('overview-project-name').innerText = p.name;
updateProjectStats();
const c = document.getElementById('unit-list-container'); c.innerHTML = '';
p.units.forEach((u, idx) => {
const div = document.createElement('div'); div.className = 'unit-card';
div.onclick = () => openUnit(idx);
div.innerHTML = `
<div class="unit-info">
<div class="unit-name">${u.name}</div>
<div class="unit-count">${u.words.length} Wörter</div>
</div>
<div class="unit-actions">
<button class="btn-small-icon" style="background:#333;" onclick="event.stopPropagation(); openUnitEditModal(${idx})">⚙️</button>
</div>
`;
c.appendChild(div);
});
}

function createNewUnit() {
const name = document.getElementById('new-unit-name').value.trim();
if(!name) return;
appData.projects[appData.activeProjectId].units.push({ name: name, words: [] });
save(); document.getElementById('new-unit-name').value=''; renderProjectOverview();
}

function openProjectImportModal() {
const list = document.getElementById('import-project-list');
list.innerHTML = '';
appData.projects.forEach((p, idx) => {
if (idx !== appData.activeProjectId) {
const btn = document.createElement('button');
btn.className = "secondary";
btn.style.marginBottom = "8px";
btn.innerText = `📂 ${p.name}`;
btn.onclick = () => performProjectImport(idx);
list.appendChild(btn);
}
});
if(list.innerHTML === '') list.innerHTML = "<p style='color:#666'>Keine anderen Projekte vorhanden.</p>";
document.getElementById('import-project-modal').classList.remove('hidden');
}

function closeImportProjectModal() {
document.getElementById('import-project-modal').classList.add('hidden');
}

function performProjectImport(sourceProjectIdx) {
const sourceP = appData.projects[sourceProjectIdx];
const targetP = appData.projects[appData.activeProjectId];
const newUnit = { name: sourceP.name, words: [] };
sourceP.units.forEach(u => {
u.words.forEach(w => {
newUnit.words.push(JSON.parse(JSON.stringify(w)));
});
});
targetP.units.push(newUnit);
save();
closeImportProjectModal();
renderProjectOverview();
alert(`Projekt "${sourceP.name}" wurde als Unit importiert!`);
}

// --- UNIT DETAILS ---
function openUnit(idx) {
activeUnitId = idx;
switchTab('unit-details');
}

function startActiveUnitTraining() {
if(activeUnitId !== null) {
startTest(activeUnitId);
} else {
alert("Fehler: Keine Unit aktiv.");
}
}

function renderUnitDetails() {
const p = appData.projects[appData.activeProjectId];
const u = p.units[activeUnitId];
document.getElementById('unit-title-display').innerText = u.name;
updateUnitStats();
}

function openUnitEditModal(uIdx) {
editUnitIndex = uIdx;
const p = appData.projects[appData.activeProjectId];
document.getElementById('edit-unit-name-modal-input').value = p.units[uIdx].name;
document.getElementById('unit-edit-modal').classList.remove('hidden');
}
function closeUnitEditModal() {
document.getElementById('unit-edit-modal').classList.add('hidden');
}
function saveUnitNameFromModal() {
const newName = document.getElementById('edit-unit-name-modal-input').value.trim();
if(newName) {
appData.projects[appData.activeProjectId].units[editUnitIndex].name = newName;
save();
closeUnitEditModal();
renderProjectOverview();
}
}
function deleteUnitFromModal() {
if(confirm("Unit wirklich löschen? Alle Karten gehen verloren!")) {
appData.projects[appData.activeProjectId].units.splice(editUnitIndex, 1);
save();
closeUnitEditModal();
renderProjectOverview();
}
}
function moveUnit(direction) {
const p = appData.projects[appData.activeProjectId];
const newIndex = editUnitIndex + direction;
if(newIndex >= 0 && newIndex < p.units.length) {
const temp = p.units[editUnitIndex];
p.units[editUnitIndex] = p.units[newIndex];
p.units[newIndex] = temp;
editUnitIndex = newIndex;
save();
renderProjectOverview();
}
}

// --- DATABASE & LISTS ---
function initDBFilters() {
const p = appData.projects[appData.activeProjectId];
const filter = document.getElementById('db-unit-filter');
const addSelector = document.getElementById('add-word-unit-select');
filter.innerHTML = '<option value="all">Alle Units anzeigen</option>';
addSelector.innerHTML = '';
p.units.forEach((u, i) => {
const selected = (activeUnitId !== null && activeUnitId === i) ? 'selected' : '';
filter.innerHTML += `<option value="${i}" ${selected}>${u.name}</option>`;
addSelector.innerHTML += `<option value="${i}">${u.name}</option>`;
});
const globalAdd = document.getElementById('global-add-area');
if (activeUnitId === null) {
globalAdd.style.display = 'block';
} else {
globalAdd.style.display = 'none';
}
isDuplicateFilterActive = false;
updateDuplicateButton();
}

function goBackFromDB() {
if (activeUnitId !== null) {
switchTab('unit-details');
} else {
switchTab('project-overview');
}
}

function addVocab() {
if (activeUnitId === null) return alert("Fehler: Keine Unit ausgewählt.");
const de = cleanDisplay(document.getElementById('input-de').value);
const lang = cleanDisplay(document.getElementById('input-lang').value);
const note = cleanDisplay(document.getElementById('input-note').value);
if(!de || !lang) return alert("Bitte ausfüllen");
appData.projects[appData.activeProjectId].units[activeUnitId].words.push({
type: 'word', de: de, lang: lang, note: note, active: true, priority: false, box: 0, lastWrong: false
});
save();
document.getElementById('input-de').value=''; document.getElementById('input-lang').value=''; document.getElementById('input-note').value='';
renderUnitDetails();
alert("Gespeichert!");
}

function addVocabGlobal() {
const unitIdx = document.getElementById('add-word-unit-select').value;
const de = cleanDisplay(document.getElementById('global-input-de').value);
const lang = cleanDisplay(document.getElementById('global-input-lang').value);
const note = cleanDisplay(document.getElementById('global-input-note').value);
if(!de || !lang) return alert("Bitte ausfüllen");
appData.projects[appData.activeProjectId].units[unitIdx].words.push({
type: 'word', de: de, lang: lang, note: note, active: true, priority: false, box: 0, lastWrong: false
});
save();
document.getElementById('global-input-de').value=''; document.getElementById('global-input-lang').value=''; document.getElementById('global-input-note').value='';
renderList();
}

function getDisplayList() {
const p = appData.projects[appData.activeProjectId];
const mode = document.getElementById('db-unit-filter').value;
let list = [];
p.units.forEach((u, uIdx) => {
if(mode === 'all' || mode == uIdx) {
u.words.forEach((w, wIdx) => {
list.push({ ...w, unitIdx: uIdx, wordIdx: wIdx, unitName: u.name });
});
}
});
return list;
}

function toggleDuplicateFilter() {
isDuplicateFilterActive = !isDuplicateFilterActive;
updateDuplicateButton();
renderList();
}

function updateDuplicateButton() {
const btn = document.getElementById('btn-show-duplicates');
if (isDuplicateFilterActive) {
btn.style.backgroundColor = "var(--accent-seq)";
btn.style.color = "white";
btn.innerText = "Alle anzeigen";
} else {
btn.style.backgroundColor = "";
btn.style.color = "var(--text-muted)";
btn.innerText = "⚠️ Duplikate finden";
}
}

function renderList() {
let list = getDisplayList();
const container = document.getElementById('vocab-list-container');
const search = document.getElementById('search-input').value.toLowerCase();
const sort = document.getElementById('sort-select').value;
let filtered = list.filter(item => {
return (item.de.toLowerCase().includes(search) || item.lang.toLowerCase().includes(search));
});
if (isDuplicateFilterActive) {
const counts = {};
filtered.forEach(item => {
const key = cleanString(item.de);
counts[key] = (counts[key] || 0) + 1;
});
filtered = filtered.filter(item => counts[cleanString(item.de)] > 1);
}
if (sort === 'newest') filtered.reverse();
else if (sort === 'box-asc') filtered.sort((a,b) => a.box - b.box);
else if (sort === 'box-desc') filtered.sort((a,b) => b.box - a.box);
document.getElementById('list-count').innerText = filtered.length;
container.innerHTML = '';
filtered.forEach(item => {
const div = document.createElement('div');
div.className = `vocab-item fade-in ${!item.active ? 'paused' : ''}`;
div.innerHTML = `
<div class="status-bar box-${item.box}">
<div style="flex:1">${item.unitName}</div>
<div style="flex:1; text-align:center;">Box ${item.box}</div>
<div style="flex:1; text-align:right;">${item.lastWrong?'⚠️':''}</div>
</div>
<div class="vocab-content-pad">
<div class="vocab-columns-wrapper">
<div class="vocab-col left">${item.de}</div>
<div class="vocab-col center">➜</div>
<div class="vocab-col right">${item.lang}</div>
</div>
${item.note ? `<div class="vocab-note-area">💡 ${item.note}</div>` : ''}
</div>
<div class="vocab-footer">
<div></div>
<div class="vocab-actions-wrapper">
<button class="btn-icon btn-edit" onclick="openEditModal(${item.unitIdx}, ${item.wordIdx})">✎</button>
<button class="btn-icon btn-delete-small" onclick="deleteCard(${item.unitIdx}, ${item.wordIdx})">✕</button>
</div>
</div>
`;
container.appendChild(div);
});
}

function deleteCard(uIdx, wIdx) {
if(confirm("Löschen?")) {
appData.projects[appData.activeProjectId].units[uIdx].words.splice(wIdx, 1);
save(); renderList();
}
}

// --- EDITING ---
let editTarget = null;
function openEditModal(uIdx, wIdx) {
editTarget = { uIdx, wIdx };
const p = appData.projects[appData.activeProjectId];
const item = p.units[uIdx].words[wIdx];
const unitSel = document.getElementById('edit-unit-select');
unitSel.innerHTML = '';
p.units.forEach((u, i) => {
unitSel.innerHTML += `<option value="${i}" ${i==uIdx?'selected':''}>${u.name}</option>`;
});
document.getElementById('edit-content-area').innerHTML = `
<textarea id="edit-de" rows="1">${item.de}</textarea>
<textarea id="edit-lang" rows="1">${item.lang}</textarea>
<textarea id="edit-note" rows="2">${item.note||''}</textarea>
`;
document.getElementById('edit-modal').classList.remove('hidden');
}

function saveEdit() {
const newUIdx = parseInt(document.getElementById('edit-unit-select').value);
const de = cleanDisplay(document.getElementById('edit-de').value);
const lang = cleanDisplay(document.getElementById('edit-lang').value);
const note = cleanDisplay(document.getElementById('edit-note').value);
const p = appData.projects[appData.activeProjectId];
const oldUIdx = editTarget.uIdx;
const wIdx = editTarget.wIdx;
const card = p.units[oldUIdx].words[wIdx];
card.de = de; card.lang = lang; card.note = note;
if (newUIdx !== oldUIdx) {
p.units[oldUIdx].words.splice(wIdx, 1);
p.units[newUIdx].words.push(card);
}
save();
closeEditModal();
if(!document.getElementById('view-list-manager').classList.contains('hidden')) renderList();
if(!document.getElementById('view-test').classList.contains('hidden') && currentCardInfo) {
if(newUIdx === oldUIdx) {
document.getElementById('question-display').innerText = (direction===0 ? de : lang);
document.getElementById('test-unit-name').innerText = "Unit: " + p.units[newUIdx].name;
}
}
}

function deleteCurrentCardFromEdit() {
if(!confirm("Wirklich löschen?")) return;
const p = appData.projects[appData.activeProjectId];
p.units[editTarget.uIdx].words.splice(editTarget.wIdx, 1);
save();
closeEditModal();
if(!document.getElementById('view-list-manager').classList.contains('hidden')) renderList();
if(!document.getElementById('view-test').classList.contains('hidden')) {
nextQuestion();
}
}

function closeEditModal() { document.getElementById('edit-modal').classList.add('hidden'); }

// --- TRAINING LOGIC ---
function startTest(unitIdx) {
const p = appData.projects[appData.activeProjectId];
trainingQueue = [];
const seenQuestions = new Set();
p.units.forEach((u, uI) => {
if (unitIdx === null || unitIdx === uI) {
u.words.forEach((w, wI) => {
if (w.active) {
const key = cleanString(w.de);
if (!seenQuestions.has(key)) {
trainingQueue.push({
card: w, uIdx: uI, wIdx: wI, uName: u.name, id: `${uI}-${wI}`
});
seenQuestions.add(key);
}
}
});
}
});
if (trainingQueue.length === 0) return alert("Keine aktiven Karten in dieser Auswahl.");
cooldownQueue = [];
switchTab('test');
nextQuestion();
}

function quitTest() {
if (activeUnitId !== null) {
switchTab('unit-details');
} else {
switchTab('project-overview');
}
}

function nextQuestion() {
document.getElementById('input-area').classList.remove('hidden');
document.getElementById('result-area').classList.add('hidden');
document.getElementById('test-input').value = '';
document.getElementById('test-input').focus();
cooldownQueue.forEach(i => i.wait--);
const p = appData.projects[appData.activeProjectId];
for (let i = cooldownQueue.length - 1; i >= 0; i--) {
const qItem = cooldownQueue[i];
const u = p.units[qItem.uIdx];
if (u && u.words[qItem.wIdx]) {
if (qItem.wait <= 0) cooldownQueue.splice(i, 1);
} else {
cooldownQueue.splice(i, 1);
}
}
const blockedIds = cooldownQueue.map(c => c.id);
trainingQueue = trainingQueue.filter(t => p.units[t.uIdx] && p.units[t.uIdx].words[t.wIdx]);
let candidates = trainingQueue.filter(item => !blockedIds.includes(item.id));
if (candidates.length === 0) {
if (cooldownQueue.length > 0) {
cooldownQueue.sort((a,b) => a.wait - b.wait);
const forcedId = cooldownQueue[0].id;
candidates = trainingQueue.filter(item => item.id === forcedId);
if(candidates.length === 0) { cooldownQueue.shift(); return nextQuestion(); }
cooldownQueue.shift();
} else {
alert("Training beendet!"); return quitTest();
}
}
let pool = candidates.filter(x => x.card.priority);
if(pool.length === 0) pool = candidates.filter(x => x.card.box === 0);
if(pool.length === 0) pool = candidates.filter(x => x.card.box < 5);
if(pool.length === 0) pool = candidates;
const pick = pool[Math.floor(Math.random() * pool.length)];
currentCardInfo = pick;
direction = Math.random() < 0.5 ? 0 : 1;
document.getElementById('test-unit-name').innerText = "Unit: " + pick.uName;
document.getElementById('box-display').innerText = "Box " + pick.card.box;
document.getElementById('question-display').innerText = (direction === 0 ? pick.card.de : pick.card.lang);
document.getElementById('priority-indicator').style.visibility = pick.card.priority ? 'visible' : 'hidden';
}

function checkAnswer() {
const input = cleanString(document.getElementById('test-input').value);
const target = direction === 0 ? currentCardInfo.card.lang : currentCardInfo.card.de;
const isCorrect = input === cleanString(target);
const userRaw = document.getElementById('test-input').value;
showResult(isCorrect, target, userRaw);
}

function editCurrentCard() {
if(currentCardInfo) {
openEditModal(currentCardInfo.uIdx, currentCardInfo.wIdx);
}
}

function showResult(success, solution, userAns) {
document.getElementById('input-area').classList.add('hidden');
document.getElementById('result-area').classList.remove('hidden');
const fb = document.getElementById('feedback-message');
const noteDiv = document.getElementById('notes-display');
const oldBox = currentCardInfo.card.box;
let newBox = oldBox;
const totalCards = trainingQueue.length;
const safeWaitWrong = Math.max(0, Math.min(3, totalCards - 1));
const safeWaitCorrect = Math.max(0, Math.min(10, totalCards - 1));
const displayAns = userAns ? userAns : "(Leer)";
let userHtml = `<div style="color:#aaa; font-size:0.9rem; margin-bottom:5px;">Deine Antwort: <span style="color:#fff">${displayAns}</span></div>`;
if (success) {
if (newBox < 5) newBox++;
currentCardInfo.card.box = newBox;
currentCardInfo.card.lastWrong = false;
updateStreak();
fb.innerHTML = `<div class="feedback-box correct"><h3>Richtig! 🎉</h3></div>${userHtml}<div style="margin-top:5px; color:#aaa;">Lösung: ${solution}</div>`;
document.getElementById('override-container').innerHTML = '';
cooldownQueue.push({ id: currentCardInfo.id, wait: safeWaitCorrect, uIdx:currentCardInfo.uIdx, wIdx:currentCardInfo.wIdx });
} else {
newBox = 0;
currentCardInfo.card.box = 0;
currentCardInfo.card.lastWrong = true;
fb.innerHTML = `<div class="feedback-box wrong"><h3>Leider falsch</h3></div>${userHtml}<div style="margin-top:5px; font-size:1.1rem;">Lösung:<br><span style="color:var(--success-text)">${solution}</span></div>`;
document.getElementById('override-container').innerHTML = `<button class="override-btn" onclick="overrideResult()">War doch richtig (Tippfehler)</button>`;
cooldownQueue.push({ id: currentCardInfo.id, wait: safeWaitWrong, uIdx:currentCardInfo.uIdx, wIdx:currentCardInfo.wIdx });
}
document.getElementById('box-display').innerHTML = `<span class="gold-trans">Box ${oldBox} ➔ Box ${newBox}</span>`;
if(currentCardInfo.card.note) {
noteDiv.innerText = "💡 " + currentCardInfo.card.note;
noteDiv.classList.remove('hidden');
} else {
noteDiv.classList.add('hidden');
}
save();
}

function overrideResult() {
const totalCards = trainingQueue.length;
const safeWaitCorrect = Math.max(0, Math.min(10, totalCards - 1));
// Remove wrong wait
cooldownQueue = cooldownQueue.filter(c => c.id !== currentCardInfo.id);
// Add correct wait
cooldownQueue.push({ id: currentCardInfo.id, wait: safeWaitCorrect, uIdx:currentCardInfo.uIdx, wIdx:currentCardInfo.wIdx });
if(currentCardInfo.card.box < 5) currentCardInfo.card.box++;
currentCardInfo.card.lastWrong = false;
updateStreak();
save();
nextQuestion();
}

// --- EXPORT ---
function clearCurrentProjectData() {
if(!confirm("Alles leeren?")) return;
appData.projects[appData.activeProjectId].units.forEach(u => u.words = []);
save(); renderList();
}

function exportData() {
const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData));
const node = document.createElement('a');
node.setAttribute("href", dataStr);
node.setAttribute("download", "core_learning_backup.json");
document.body.appendChild(node); node.click(); node.remove();
}

function exportCSV() {
let csv = "data:text/csv;charset=utf-8,\uFEFFUnit;Frage;Antwort;Notiz;Box\n";
appData.projects[appData.activeProjectId].units.forEach(u => {
u.words.forEach(w => {
const c = t => '"' + (t?t.replace(/"/g,'""'):"") + '"';
csv += `${c(u.name)};${c(w.de)};${c(w.lang)};${c(w.note)};${w.box}\n`;
});
});
const node = document.createElement('a');
node.setAttribute("href", encodeURI(csv));
node.setAttribute("download", "core_export.csv");
document.body.appendChild(node); node.click(); node.remove();
}

function importCSV(input) {
const file = input.files[0];
if (!file) return;
const reader = new FileReader();
reader.onload = function(e) {
const lines = e.target.result.split('\n');
let count = 0;
// Default to first unit
const targetUnit = appData.projects[appData.activeProjectId].units[0];
const sep = lines[0].includes(';') ? ';' : ',';
lines.forEach(line => {
if(!line.trim()) return;
const parts = line.split(sep);
if(parts.length >= 2) {
targetUnit.words.push({
type:'word', de:cleanDisplay(parts[0]), lang:cleanDisplay(parts[1]),
note: parts[2]?cleanDisplay(parts[2]):"", active:true, priority:false, box:0, lastWrong:false
});
count++;
}
});
save();
if(!document.getElementById('view-list-manager').classList.contains('hidden')) renderList();
alert(count + " importiert in Unit: " + targetUnit.name);
input.value='';
};
reader.readAsText(file);
}

// HELPER
function toggleSelectMode() { isSelectMode = !isSelectMode; renderList(); }
function dissolveSequence() { /* Placeholder */ }

// --- PWA Service Worker Registrierung ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('SW registriert:', reg.scope))
      .catch(err => console.log('SW Fehler:', err));
  });
}