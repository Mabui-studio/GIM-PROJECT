/**
 * Majestic Betta V6.3 — Hybrid Evolution + Betta Master 2026 breeding schema
 */
import { breedFish, computeEffectiveBaseStats } from "../fish/breeding.js";
import type { Fish } from "../fish/types.js";
import { BreedingIntegrityError } from "../fish/types.js";
import {
  createStarterFish,
  patternDnaFromId,
  speciesToPresentation,
} from "./fish-bridge.js";

const canvas = document.getElementById("aquarium") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
let width: number;
let height: number;

type Presentation = "KOI" | "GALAXY";

const STATE = {
  ownerId: "player-1",
  fishes: [] as Betta[],
  seaweeds: [] as { x: number; h: number }[],
  bubbles: [] as { x: number; y: number; r: number; s: number; egg: boolean }[],
  food: [] as unknown[],
  care: 0,
  o2: 100,
  waste: 0,
  autoFeeder: false,
  showVitality: true,
  isZen: false,
  currentBG: "#1a365d",
};

class Betta {
  id: string;
  dna: string;
  type: Presentation;
  sex: "male" | "female";
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hunger: number;
  age: number;
  isRetired: boolean;
  state: "idle" | "feeding" | "romance";
  target: { x: number; y: number } | null;
  wagPhase: number;
  sprite: HTMLCanvasElement;
  /** Schema เดียวกับ Betta Master 2026 — ใช้กับ breedFish */
  gameFish: Fish;

  constructor(
    id: string,
    type: Presentation,
    sex: "male" | "female",
    ownerId: string,
    existingFish?: Fish,
  ) {
    this.gameFish = existingFish ?? createStarterFish(id, ownerId, type, sex);
    this.id = this.gameFish.id;
    this.dna = patternDnaFromId(this.id);
    this.type = speciesToPresentation(this.gameFish.species);
    this.sex = this.gameFish.gender === "F" ? "female" : "male";
    this.size = 40 + Math.random() * 15;
    this.x = Math.random() * window.innerWidth;
    this.y = window.innerHeight * 0.2 + Math.random() * (window.innerHeight * 0.7);
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 1;
    this.hunger = 100;
    this.age = 0;
    this.isRetired = false;
    this.state = "idle";
    this.target = null;
    this.wagPhase = Math.random() * Math.PI * 2;

    this.sprite = document.createElement("canvas");
    this.sprite.width = 750;
    this.sprite.height = 750;
    this.bakeBody();
  }

  bakeBody() {
    const bCtx = this.sprite.getContext("2d")!;
    const cx = 375;
    const cy = 375;
    const s = 1.5;

    bCtx.save();
    bCtx.translate(cx, cy);
    if (this.sex === "female") bCtx.filter = "saturate(70%) brightness(95%)";

    bCtx.beginPath();
    bCtx.ellipse(0, 0, 100 * s, 45 * s, 0, 0, Math.PI * 2);
    bCtx.fillStyle = "#f0f0f0";
    bCtx.fill();

    bCtx.globalCompositeOperation = "source-atop";
    const colors =
      this.type === "GALAXY" ? ["#000", "#1a237e", "#4a148c"] : ["#ff6d00", "#212121", "#fff"];
    for (let i = 0; i < 6; i++) {
      const val = parseInt(this.dna.slice(i * 2, i * 2 + 2), 10);
      bCtx.fillStyle = colors[i % 3] + "aa";
      bCtx.beginPath();
      bCtx.arc((val - 50) * 2.5, val - 50, 30 + val / 2, 0, Math.PI * 2);
      bCtx.fill();
    }

    if (this.type === "GALAXY") {
      bCtx.fillStyle = "rgba(255,255,255,0.8)";
      for (let i = 0; i < 20; i++) bCtx.fillRect(Math.random() * 300 - 150, Math.random() * 150 - 75, 2, 2);
    }

    bCtx.globalCompositeOperation = "source-over";
    bCtx.fillStyle = "black";
    bCtx.beginPath();
    bCtx.arc(80 * s, -10 * s, 10, 0, Math.PI * 2);
    bCtx.fill();
    bCtx.fillStyle = "white";
    bCtx.beginPath();
    bCtx.arc(85 * s, -12 * s, 3, 0, Math.PI * 2);
    bCtx.fill();

    bCtx.restore();
  }

  update() {
    this.age += 0.001;
    if (this.age > 10) this.isRetired = true;

    if (this.state === "feeding" && this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        this.x += (dx / dist) * 6;
        this.y += (dy / dist) * 6;
        this.vx = dx;
      } else {
        this.hunger = 100;
        this.state = "idle";
        STATE.care += 2;
      }
    } else if (this.state === "romance") {
      const dx = width / 2 - this.x;
      const dy = height / 2 - this.y;
      this.x += dx * 0.02;
      this.y += dy * 0.02;
      if (Math.abs(dx) < 20 && Math.random() < 0.05) spawnBubble(this.x, this.y, true);
    } else {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 50 || this.x > width - 50) this.vx *= -1;
      if (this.y < height * 0.2 || this.y > height - 50) this.vy *= -1;
      this.hunger -= 0.02;
    }

    this.wagPhase += 0.15;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.vx < 0) ctx.scale(-1, 1);

    const scale = this.size / 150;
    ctx.scale(scale, scale);

    const wag = Math.sin(this.wagPhase) * 25;

    ctx.fillStyle = this.type === "GALAXY" ? "#311b92" : "#d50000";
    ctx.beginPath();
    ctx.moveTo(-90, 0);
    ctx.bezierCurveTo(-150, -80 + wag, -250 + wag, -40, -280, wag);
    ctx.bezierCurveTo(-250, 40, -150, 80 + wag, -90, 0);
    ctx.fill();

    ctx.drawImage(this.sprite, -375, -375);

    if (this.isRetired) {
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 100, 45, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (STATE.showVitality && !STATE.isZen) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(this.x - 30, this.y - this.size - 10, 60, 5);
      ctx.fillStyle = this.hunger > 30 ? "#00e676" : "#ff1744";
      ctx.fillRect(this.x - 30, this.y - this.size - 10, 60 * (this.hunger / 100), 5);
    }
  }
}

function renderEnv(t: number) {
  const waterLevel = height * 0.15;

  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(0, 0, width, waterLevel);

  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.moveTo(0, waterLevel);
  for (let x = 0; x <= width; x += 20) {
    ctx.lineTo(x, waterLevel + Math.sin(x * 0.01 + t * 0.002) * 8);
  }
  ctx.lineTo(width, 0);
  ctx.lineTo(0, 0);
  ctx.fill();

  STATE.seaweeds.forEach((sw, i) => {
    const sway = Math.sin(t * 0.001 + i) * 15;
    const grad = ctx.createLinearGradient(sw.x, height, sw.x, height - sw.h);
    grad.addColorStop(0, "#1b5e20");
    grad.addColorStop(1, "#81c784");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sw.x, height);
    for (let j = 0; j < 10; j++) {
      const y = height - (sw.h / 10) * j;
      const x = sw.x + (sway / 10) * j;
      ctx.lineTo(x + (j % 2 ? 15 : -15), y);
    }
    ctx.lineTo(sw.x + sway, height - sw.h);
    ctx.fill();
  });

  STATE.bubbles.forEach((b, i) => {
    b.y -= b.s;
    ctx.fillStyle = b.egg ? "#fff9c4" : "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    if (b.y < waterLevel) {
      b.s = 0;
      if (!b.egg) STATE.bubbles.splice(i, 1);
    }
  });
}

let selectedIndices: number[] = [];

function initGacha() {
  const grid = document.getElementById("gacha-grid")!;
  for (let i = 0; i < 10; i++) {
    const div = document.createElement("div");
    div.className = "gacha-card";
    const type: Presentation = Math.random() > 0.5 ? "GALAXY" : "KOI";
    const sex = Math.random() > 0.5 ? "male" : "female";
    div.dataset.type = type;
    div.dataset.sex = sex;
    div.innerHTML = `<span>${sex === "male" ? "♂️" : "♀️"}</span><b>${type}</b>`;
    div.onclick = () => {
      if (div.classList.contains("selected")) {
        div.classList.remove("selected");
        selectedIndices = selectedIndices.filter((idx) => idx !== i);
      } else if (selectedIndices.length < 3) {
        div.classList.add("selected");
        selectedIndices.push(i);
      }
      (document.getElementById("start-btn") as HTMLButtonElement).disabled =
        selectedIndices.length !== 3;
    };
    grid.appendChild(div);
  }
}

function startGame() {
  (document.getElementById("gacha-overlay") as HTMLElement).style.display = "none";
  const grid = document.getElementById("gacha-grid")!;
  selectedIndices.forEach((idx) => {
    const card = grid.children[idx] as HTMLElement;
    const type = card.dataset.type as Presentation;
    const sex = card.dataset.sex as "male" | "female";
    const fishId = `fish-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`;
    STATE.fishes.push(new Betta(fishId, type, sex, STATE.ownerId));
  });
  requestAnimationFrame(loop);
}

function togglePanel(id: "left" | "right") {
  const p = document.getElementById(id + "-panel")!;
  const other = document.getElementById((id === "left" ? "right" : "left") + "-panel")!;
  other.classList.remove("active");
  p.classList.toggle("active");
}

function toggleZen() {
  STATE.isZen = !STATE.isZen;
  (document.getElementById("hud") as HTMLElement).style.display = STATE.isZen ? "none" : "flex";
  (document.getElementById("zen-clock") as HTMLElement).style.display = STATE.isZen ? "block" : "none";
  (document.getElementById("exit-zen") as HTMLElement).style.display = STATE.isZen ? "block" : "none";
}

function setBG(c: string) {
  document.body.style.background = c;
  STATE.currentBG = c;
}

function addSeaweed() {
  STATE.seaweeds.push({ x: Math.random() * width, h: 150 + Math.random() * 100 });
}

function spawnBubble(x: number, y: number, egg = false) {
  STATE.bubbles.push({
    x,
    y,
    r: egg ? 4 : Math.random() * 3 + 2,
    s: Math.random() * 1 + 0.5,
    egg,
  });
}

function toggleVitality() {
  STATE.showVitality = !STATE.showVitality;
}

function triggerRomance() {
  const living = STATE.fishes.filter((f) => !f.isRetired);
  const females = living.filter((f) => f.gameFish.gender === "F");
  const males = living.filter((f) => f.gameFish.gender === "M");
  if (females.length < 1 || males.length < 1) {
    alert("ต้องมีปลาแม่ ♀ และพ่อ ♂ อย่างน้อย 1 ตัว (ตาม schema Betta Master 2026)");
    return;
  }
  const motherBetta = females[0]!;
  const fatherBetta = males[0]!;
  motherBetta.state = "romance";
  fatherBetta.state = "romance";

  const offspringId = `fry-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    const { offspring } = breedFish(
      { mother: motherBetta.gameFish, father: fatherBetta.gameFish },
      {
        offspringId,
        ownerId: STATE.ownerId,
        entropy: String(performance.now()),
      },
    );
    const presentation = speciesToPresentation(offspring.species);
    const babySex = offspring.gender === "F" ? "female" : "male";
    const baby = new Betta(offspring.id, presentation, babySex, STATE.ownerId, offspring);
    baby.x = width / 2;
    baby.y = height * 0.45;
    STATE.fishes.push(baby);

    const eff = computeEffectiveBaseStats(offspring);
    const el = document.getElementById("breed-result");
    if (el) {
      el.innerHTML = `F${offspring.bloodline.generation} <b>${offspring.species}</b> ${offspring.rarity}<br>
        HP ${eff.hp.toFixed(0)} ATK ${eff.atk.toFixed(0)} DEF ${eff.def.toFixed(0)} SPD ${eff.spd.toFixed(0)}<br>
        Precision ${(offspring.precisionScore * 100).toFixed(0)}% · ${offspring.activeSkillIds.join(", ") || "-"}`;
    }
    motherBetta.state = "idle";
    fatherBetta.state = "idle";
  } catch (e) {
    motherBetta.state = "idle";
    fatherBetta.state = "idle";
    const msg = e instanceof BreedingIntegrityError ? e.message : e instanceof Error ? e.message : String(e);
    alert(msg);
  }
}

function buyAutoFeeder() {
  if (STATE.care >= 100) {
    STATE.care -= 100;
    STATE.autoFeeder = true;
    (document.getElementById("buy-feeder") as HTMLButtonElement).disabled = true;
  } else {
    alert("แต้ม Care ไม่พอ!");
  }
}

function loop(t: number) {
  ctx.clearRect(0, 0, width, height);
  renderEnv(t);

  STATE.fishes.forEach((f) => {
    f.update();
    f.draw();
    if (STATE.autoFeeder && f.hunger < 90 && f.state === "idle") {
      f.state = "feeding";
      f.target = { x: width / 2, y: height * 0.2 };
    }
  });

  document.getElementById("care-val")!.innerText = String(STATE.care);
  document.getElementById("o2-val")!.innerText = String(
    Math.floor(100 - STATE.fishes.length * 5 + STATE.seaweeds.length * 10),
  );
  document.getElementById("waste-val")!.innerText = String(
    Math.floor(STATE.fishes.length * 10 - STATE.seaweeds.length * 5),
  );

  const now = new Date();
  document.getElementById("zen-clock")!.innerText =
    now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");

  requestAnimationFrame(loop);
}

window.addEventListener("resize", () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
});
window.dispatchEvent(new Event("resize"));
initGacha();

const clock = document.getElementById("zen-clock")!;
clock.onmousedown = (e) => {
  const shiftX = e.clientX - clock.getBoundingClientRect().left;
  const shiftY = e.clientY - clock.getBoundingClientRect().top;
  document.onmousemove = (ev) => {
    clock.style.left = ev.pageX - shiftX + "px";
    clock.style.top = ev.pageY - shiftY + "px";
  };
  document.onmouseup = () => {
    document.onmousemove = null;
    clock.onmouseup = null;
  };
};

const htmlHandlers = globalThis as typeof globalThis & {
  startGame: () => void;
  togglePanel: (id: string) => void;
  toggleZen: () => void;
  setBG: (c: string) => void;
  addSeaweed: () => void;
  toggleVitality: () => void;
  triggerRomance: () => void;
  buyAutoFeeder: () => void;
};
htmlHandlers.startGame = startGame;
htmlHandlers.togglePanel = (id: string) => togglePanel(id as "left" | "right");
htmlHandlers.toggleZen = toggleZen;
htmlHandlers.setBG = setBG;
htmlHandlers.addSeaweed = addSeaweed;
htmlHandlers.toggleVitality = toggleVitality;
htmlHandlers.triggerRomance = triggerRomance;
htmlHandlers.buyAutoFeeder = buyAutoFeeder;
