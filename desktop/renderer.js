const folderEl = document.getElementById("database-folder");
const fileEl = document.getElementById("database-file");
const levelCountEl = document.getElementById("level-count");
const requirementCountEl = document.getElementById("requirement-count");
const levelSelectEl = document.getElementById("level-select");
const levelListEl = document.getElementById("level-list");
const requirementListEl = document.getElementById("requirement-list");
const requirementFormEl = document.getElementById("requirement-form");

let state = null;

function renderLevels(levels) {
  levelSelectEl.innerHTML = "";
  levelListEl.innerHTML = "";

  for (const level of levels) {
    const option = document.createElement("option");
    option.value = level.level_code;
    option.textContent = `${level.level_code} - ${level.level_name}`;
    levelSelectEl.appendChild(option);

    const card = document.createElement("article");
    card.className = "item";
    card.innerHTML = `
      <strong>${level.level_code}</strong>
      <div>${level.level_name}</div>
      <div class="muted">${level.short_definition}</div>
    `;
    levelListEl.appendChild(card);
  }
}

function renderRequirements(requirements) {
  requirementListEl.innerHTML = "";

  if (requirements.length === 0) {
    const empty = document.createElement("article");
    empty.className = "item";
    empty.innerHTML = "<strong>Henuz gereksinim yok.</strong><div class='muted'>Yeni kayit eklemek icin formu kullanin.</div>";
    requirementListEl.appendChild(empty);
    return;
  }

  for (const requirement of requirements) {
    const card = document.createElement("article");
    card.className = "item";
    card.innerHTML = `
      <strong>${requirement.title}</strong>
      <div class="meta">
        <span class="tag">${requirement.req_code}</span>
        <span class="tag">${requirement.level_code}</span>
        <span class="tag">${requirement.status}</span>
      </div>
      <div>${requirement.statement || ""}</div>
    `;
    requirementListEl.appendChild(card);
  }
}

function render(nextState) {
  state = nextState;
  folderEl.textContent = nextState.databaseFolder;
  fileEl.textContent = nextState.databaseFile;
  levelCountEl.textContent = String(nextState.data.requirementLevels.length);
  requirementCountEl.textContent = String(nextState.data.requirements.length);
  renderLevels(nextState.data.requirementLevels);
  renderRequirements(nextState.data.requirements);
}

requirementFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(requirementFormEl);
  const payload = Object.fromEntries(formData.entries());
  const result = await window.rmsApi.addRequirement(payload);
  render({
    databaseFolder: state.databaseFolder,
    databaseFile: state.databaseFile,
    data: result.data
  });
  requirementFormEl.reset();
});

window.rmsApi.getData().then(render);
