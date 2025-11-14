/*****************************************
 * RPG Boss Battle — Unified Script
 * Features:
 * - Player & Monster turns
 * - Crits (Weak/Strong/Ultra)
 * - Agility bar multiplier
 * - Floating damage text
 * - Heal/Impact/Death particles
 * - Sound effects for attacks, crits, heal, level-up
 * - XP & Level system with bonus HP/ATK
 * - Monster scaling each round
 *****************************************/

// ---------------------
// Game State
// ---------------------
let playerHP = 100;
let monsterHP = 1000;
let playerLevel = 1;
let playerXP = 0;
let roundCounter = 1;
let monsterNextMaxHP = 1000;
let monsterDamageMultiplier = 1;

// DOM
const playerHPText = document.getElementById("playerHPText");
const monsterHPText = document.getElementById("monsterHPText");
const playerHPBar = document.getElementById("playerHPBar");
const monsterHPBar = document.getElementById("monsterHPBar");

const playerSprite = document.getElementById("playerSprite");
const monsterSprite = document.getElementById("monsterSprite");

const playerText = document.getElementById("playerText");
const monsterText = document.getElementById("monsterText");

const attackBtn = document.getElementById("attackBtn");
const healBtn = document.getElementById("healBtn");

const turnLog = document.getElementById("turnLog");
const agilityBar = document.querySelector(".agility-bar");
const agilityPointer = document.querySelector(".agility-pointer");

// Player stats panel
const playerLevelText = document.getElementById("playerLevel");
const playerXPText = document.getElementById("playerXP");
const playerAtkText = document.getElementById("playerAtk");
const playerHPBonusText = document.getElementById("playerHPBonus");

// Sounds
const sounds = {
    attack: new Audio("attack.mp3"),
    hit: new Audio("hit.mp3"),
    heal: new Audio("heal.mp3"),
    crit: new Audio("crit.mp3"),
    shockwave: new Audio("shockwave.mp3"),
    fade: new Audio("fade.mp3"),
    player: new Audio("player.mp3"),
    player2: new Audio("player2.mp3"),
    monster1: new Audio("monster1.mp3"),
    levelup: new Audio("levelup.mp3")
};
Object.values(sounds).forEach(s => s.preload="auto");

// ---------------------
// Helper Functions
// ---------------------
function addLog(text, color="white"){
    const p = document.createElement("p");
    p.textContent = text;
    p.style.color = color;
    turnLog.appendChild(p);
    turnLog.scrollTop = turnLog.scrollHeight;
}

function getXpCap(level){
    if(level<=5) return 10;
    if(level<=10) return 20;
    return 35;
}

function getBonusHP(level){
    if(level<=5) return 20;
    if(level<=10) return 50;
    return 120;
}

function getBonusAtk(level){
    if(level<=5) return 5;
    if(level<=10) return 15;
    return 35;
}

function updatePlayerStatsPanel(){
    playerLevelText.textContent = `LVL: ${playerLevel}`;
    const xpCap = getXpCap(playerLevel);
    playerXPText.textContent = `XP: ${playerXP} / ${xpCap}`;
    playerAtkText.textContent = `ATK +${getBonusAtk(playerLevel)}`;
    playerHPBonusText.textContent = `HP +${getBonusHP(playerLevel)}`;
}

function gainXP(amount){
    playerXP += amount;
    let xpCap = getXpCap(playerLevel);
    if(playerXP >= xpCap){
        playerXP -= xpCap;
        playerLevel++;
        playerHP = Math.min(100, playerHP + getBonusHP(playerLevel));
        addLog(`LEVEL UP! LVL ${playerLevel}`, "gold");
        showFlash("white",0.15);
        createParticles(playerSprite.parentElement, 30, "limegreen");
        sounds.levelup.play();
    }
    updatePlayerStatsPanel();
}

function showFlash(color="white",duration=0.1){
    const flash = document.createElement("div");
    flash.classList.add(color==="white"?"flash-white":"flash-gray");
    document.body.appendChild(flash);
    setTimeout(()=>flash.remove(),duration*1000);
}

// ---------------------
// HP & UI Updates
// ---------------------
function getMonsterMaxHP(round){
    const step = ((round-1)%10)+1;
    return step*1000;
}

function updateStats(){
    playerHPText.textContent = `${Math.round(playerHP)} / 100`;
    monsterHPText.textContent = `${Math.round(monsterHP)} / ${monsterNextMaxHP}`;

    playerHPBar.style.width = `${Math.max(0,Math.min(100,playerHP))}%`;
    monsterHPBar.style.width = `${Math.max(0,Math.min(100,(monsterHP/monsterNextMaxHP)*100))}%`;

    playerHPBar.style.backgroundColor = playerHP>=60?"green":playerHP>=30?"yellow":"red";
    monsterHPBar.style.backgroundColor = monsterHP>=monsterNextMaxHP*0.6?"green":monsterHP>=monsterNextMaxHP*0.3?"yellow":"red";
}

// Floating crit/damage text
function floatCritText(el, text, type){
    let fontSize="28px", color="yellow";
    if(type==="Strong"){ fontSize="36px"; color="orange"; el.classList.add("crit"); }
    if(type==="Ultra"){ fontSize="44px"; color="darkred"; el.classList.add("ultra"); }
    el.textContent = text;
    el.style.color = color;
    el.style.fontSize = fontSize;
    el.style.left = "50%";
    el.style.top = "55%";
    el.style.transform = "translate(-50%, -50%)";
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "floatUp 1s ease-out";
    setTimeout(()=>{ el.classList.remove("crit","ultra"); },900);
}

// Show damage chunk overlays
function showDamage(barElement, oldHP, newHP){
    const container = barElement.parentElement;
    const damage = oldHP - newHP;
    if(damage<=0) return;
    const indicator = document.createElement("div");
    indicator.className = "damage-overlay";
    indicator.style.position="absolute";
    const isPlayer = (barElement===playerHPBar);
    const maxHP = isPlayer?100:monsterNextMaxHP;
    const cWidth = container.clientWidth;
    const dmgPx = (damage/maxHP)*cWidth;
    const remainingPx = (newHP/maxHP)*cWidth;
    indicator.style.width = `${Math.max(2,dmgPx)}px`;
    indicator.style.left = `${Math.max(0,remainingPx)}px`;
    indicator.style.top="0";
    indicator.style.height="100%";
    indicator.style.background = isPlayer?"rgba(0,255,0,0.5)":"rgba(255,0,0,0.7)";
    indicator.style.borderRadius="8px";
    indicator.style.zIndex=5;
    indicator.style.transition="opacity 0.8s ease";
    container.appendChild(indicator);
    setTimeout(()=>{ indicator.style.opacity=0; setTimeout(()=>indicator.remove(),900); },200);
}

// Simple animation
function runAnimation(el,className,duration=500){
    return new Promise(resolve=>{
        el.classList.add(className);
        setTimeout(()=>{ el.classList.remove(className); resolve(); },duration);
    });
}

// Screen shake
function shakeScreen(intensity=1,duration=500){
    const el=document.querySelector(".game-container");
    const x=(Math.random()*8-4)*intensity;
    const y=(Math.random()*8-4)*intensity;
    el.style.transform=`translate(${x}px,${y}px)`;
    setTimeout(()=>el.style.transform="",duration);
}

// Shockwave / Impact
function impactEffect(target, damage, crit=false){
    const shock = document.createElement("div");
    shock.className="shockwave";
    Object.assign(shock.style,{
        position:"absolute",
        top:"50%", left:"50%",
        transform:"translate(-50%,-50%) scale(0)",
        width:"180px", height:"180px",
        borderRadius:"50%",
        border:"3px solid rgba(255,255,255,0.7)",
        opacity:"0.6", zIndex:20, pointerEvents:"none"
    });
    target.appendChild(shock);
    requestAnimationFrame(()=>{
        shock.style.transition="transform 0.45s ease-out, opacity 0.45s ease-out";
        shock.style.transform="translate(-50%,-50%) scale(2.2)";
        shock.style.opacity="0";
    });
    setTimeout(()=>shock.remove(),480);
    sounds.shockwave.play();
    if(crit||damage>20) shakeScreen(Math.min(damage/50,2),500);
    else if(damage>8) shakeScreen(0.6,220);
}

// Heal / Particle effect
function createParticles(target,count,clr="limegreen"){
    const rect = target.getBoundingClientRect();
    const centerX = rect.width/2;
    const bottomY = rect.height;
    for(let i=0;i<count;i++){
        const p=document.createElement("div");
        p.classList.add("heal-particle");
        const startX=centerX+(Math.random()*40-20);
        const startY=bottomY;
        const endX=centerX+(Math.random()*40-20);
        const endY=startY-(Math.random()*150+100);
        p.style.setProperty('--start-x',`${startX}px`);
        p.style.setProperty('--start-y',`${startY}px`);
        p.style.setProperty('--end-x',`${endX}px`);
        p.style.setProperty('--end-y',`${endY}px`);
        p.style.backgroundColor=clr;
        p.style.animationDuration=`${Math.random()*0.5+1.2}s`;
        target.appendChild(p);
        p.addEventListener("animationend",()=>p.remove());
    }
}

// XP & Level Up flash
function showFlash(color="white",duration=0.1){
    const flash=document.createElement("div");
    flash.classList.add(color==="white"?"flash-white":"flash-gray");
    document.body.appendChild(flash);
    setTimeout(()=>flash.remove(),duration*1000);
}

// ---------------------
// Crit Roll
// ---------------------
function getCrit(){
    const rand=Math.random()*100;
    if(rand<=1) return {type:"Ultra", mult:3, color:"darkred"};
    if(rand<=6) return {type:"Strong", mult:2, color:"orange"};
    if(rand<=16) return {type:"Weak", mult:1.5, color:"yellow"};
    return null;
}

// ---------------------
// Agility Bar
// ---------------------
let pointerPos=0, direction=1, agilityRunning=true;
function moveAgilityBar(){
    if(!agilityBar||!agilityPointer) return;
    const barW=agilityBar.clientWidth, ptrW=agilityPointer.offsetWidth;
    pointerPos+=direction*20;
    if(pointerPos<=0){ pointerPos=0; direction=1; }
    if(pointerPos>=barW-ptrW){ pointerPos=barW-ptrW; direction=-1; }
    agilityPointer.style.left=`${pointerPos}px`;
    if(agilityRunning) requestAnimationFrame(moveAgilityBar);
}
if(agilityBar && agilityPointer) moveAgilityBar();

function showAgilityFeedbackOnce(){
    if(!agilityBar||!agilityPointer) return 1;
    const barW=agilityBar.clientWidth, ptrW=agilityPointer.offsetWidth;
    const center=(barW-ptrW)/2;
    const dist=Math.abs(pointerPos-center);
    const feedback=document.createElement("div");
    feedback.className="agility-feedback";
    feedback.style.position="absolute";
    feedback.style.top="-40px";
    feedback.style.left="50%";
    feedback.style.transform="translateX(-50%)";
    feedback.style.fontWeight="bold";
    feedback.style.fontSize="20px";
    feedback.style.pointerEvents="none";
    let multiplier=1;
    if(dist<25){ feedback.textContent="Perfect!"; feedback.style.color="gold"; multiplier=1.6; }
    else if(dist<75){ feedback.textContent="Good"; feedback.style.color="lightgreen"; multiplier=1.25; }
    else{ feedback.textContent="Bad"; feedback.style.color="red"; multiplier=0.9; }
    agilityBar.parentElement.appendChild(feedback);
    setTimeout(()=>{ feedback.style.transition="opacity 0.6s"; feedback.style.opacity=0; setTimeout(()=>feedback.remove(),600); },500);
    return multiplier;
}

// ---------------------
// Buttons
// ---------------------
function disableButtons(){ attackBtn.disabled=true; healBtn.disabled=true; agilityRunning=false; }
function enableButtons(){ attackBtn.disabled=false; healBtn.disabled=false; agilityRunning=true; moveAgilityBar(); }

// ---------------------
// Player / Monster Actions
// ---------------------
function monsterBaseDamageForRound(){
    const base = Math.max(6, Math.floor(monsterNextMaxHP/100));
    return base * monsterDamageMultiplier;
}

// Death handling
async function handleDeath(who){
    sounds.fade.play();
    showFlash("white",0.1);
    const charEl = who==="player"?playerSprite.parentElement:monsterSprite.parentElement;
    charEl.style.transition="opacity 1.2s ease-out, transform 1.2s ease-out";
    charEl.style.opacity="0"; charEl.style.transform="translateY(-10px) scale(0.98)";
    createParticles(charEl,50,"white");
    await new Promise(r=>setTimeout(r,1250));
    charEl.style.display="none";
    roundCounter++;
    const newMonsterMax = getMonsterMaxHP(roundCounter);
    if(who==="player"){
        playerHP=100;
        charEl.style.display=""; charEl.style.opacity="0"; charEl.style.transform="translateY(10px) scale(1.02)";
        setTimeout(()=>{ charEl.style.transition="opacity 0.9s ease-out, transform 0.9s ease-out"; charEl.style.opacity="1"; charEl.style.transform="translateY(0) scale(1)"; },40);
    }else{
        monsterNextMaxHP=newMonsterMax;
        monsterHP=newMonsterMax;
        monsterDamageMultiplier+=0.1;
        const monsterEl = monsterSprite.parentElement;
        monsterEl.style.display=""; monsterEl.style.opacity="0"; monsterEl.style.transform="translateY(10px) scale(1.02)";
        setTimeout(()=>{ monsterEl.style.transition="opacity 0.9s ease-out, transform 0.9s ease-out"; monsterEl.style.opacity="1"; monsterEl.style.transform="translateY(0) scale(1)"; },40);
    }
    updateStats();
}

// ---------------------
// Player Attack
// ---------------------
attackBtn.addEventListener("click",async()=>{
    if(playerHP<=0||monsterHP<=0) return;
    disableButtons();
    addLog("You attack!","white");
    const mult = showAgilityFeedbackOnce();
    const baseDmg = Math.floor(Math.random()*10)+10+getBonusAtk(playerLevel);
    let dmg = Math.floor(baseDmg*mult);
    const crit = getCrit();
    if(crit){ dmg=Math.floor(dmg*crit.mult); addLog(`Player hits Monster for ${dmg} (${crit.type} Crit!)`,crit.color); floatCritText(monsterText,`-${dmg} (${crit.type})`,crit.type); sounds.crit.play(); }
    else { addLog(`Player hits Monster for ${dmg}`,"yellow"); floatCritText(monsterText,`-${dmg}`,"Weak"); sounds.attack.play(); }
    const oldHP=monsterHP;
    monsterHP=Math.max(0,monsterHP-dmg);
    showDamage(monsterHPBar,oldHP,monsterHP);
    updateStats();
    impactEffect(monsterSprite.parentElement,dmg,!!crit);
    await runAnimation(playerSprite.parentElement,"attack",520);
    await runAnimation(monsterSprite.parentElement,"hit",300);
    await runAnimation(playerSprite.parentElement,"return",260);
    gainXP(Math.floor(dmg/5));
    if(monsterHP<=0){ await handleDeath("monster"); } else { await monsterTurn(); }
    enableButtons();
});

// Player Heal
healBtn.addEventListener("click",async()=>{
    if(playerHP<=0||monsterHP<=0) return;
    disableButtons();
    addLog("You heal!","white");
    const heal = Math.floor(Math.random()*10)+10+Math.floor(playerLevel*1.5);
    const oldHP=playerHP;
    playerHP=Math.min(100,playerHP+heal);
    updateStats();
    showDamage(playerHPBar,oldHP,playerHP);
    addLog(`Player heals for ${Math.floor(heal)} HP`,"lime");
    floatCritText(playerText,`+${Math.floor(heal)}`,"Weak");
    createParticles(playerSprite.parentElement,heal);
    sounds.heal.play();
    await runAnimation(playerSprite.parentElement,"heal",520);
    if(monsterHP>0) await monsterTurn();
    enableButtons();
});

// Monster Turn
async function monsterTurn(){
    disableButtons();
    const action = Math.random()<0.5?"attack":"heal";
    if(action==="attack"){
        addLog("Monster attacks!","white");
        let base = monsterBaseDamageForRound();
        let dmg = Math.floor(Math.random()*base)+base;
        const crit = getCrit();
        if(crit){ dmg=Math.floor(dmg*crit.mult); addLog(`Monster hits Player for ${dmg} (${crit.type} Crit!)`,crit.color); floatCritText(playerText,`-${dmg} (${crit.type})`,crit.type); sounds.crit.play(); }
        else{ addLog(`Monster hits Player for ${dmg}`,"orange"); floatCritText(playerText,`-${dmg}`,"Weak"); sounds.hit.play(); }
        const oldHP=playerHP;
        playerHP=Math.max(0,playerHP-dmg);
        showDamage(playerHPBar,oldHP,playerHP);
        updateStats();
        impactEffect(playerSprite.parentElement,dmg,!!crit);
        await runAnimation(monsterSprite.parentElement,"attack",520);
        await runAnimation(playerSprite.parentElement,"hit",320);
        await runAnimation(monsterSprite.parentElement,"return",260);
        if(playerHP<=0){ await handleDeath("player"); }
    }else{
        addLog("Monster heals!","white");
        const heal = Math.floor(Math.random()*15)+10+Math.floor(roundCounter*2);
        const oldHP=monsterHP;
        monsterHP=Math.min(monsterNextMaxHP,monsterHP+heal);
        updateStats();
        showDamage(monsterHPBar,oldHP,monsterHP);
        addLog(`Monster heals for ${heal} HP`,"lime");
        floatCritText(monsterText,`+${heal}`,"Weak");
        createParticles(monsterSprite.parentElement,heal);
        sounds.heal.play();
        await runAnimation(monsterSprite.parentElement,"heal",520);
    }
    enableButtons();
}

// ---------------------
// Init
// ---------------------
updateStats();
updatePlayerStatsPanel();
