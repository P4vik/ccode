'use strict';

// ─── Agent type definitions (60+ types) ──────────────────────────────────────
const AGENT_TYPES = {
  // Tier 0 — top orchestrators
  orchestrator:                { color: '#f59e0b', icon: '👑', tier: 0 },
  // Tier 1 — coordinators
  planner:                     { color: '#8b5cf6', icon: '🗺️',  tier: 1 },
  'sparc-coord':               { color: '#a78bfa', icon: '⚡',  tier: 1 },
  'hierarchical-coordinator':  { color: '#c084fc', icon: '🏗️',  tier: 1 },
  'mesh-coordinator':          { color: '#e879f9', icon: '🕸️',  tier: 1 },
  'adaptive-coordinator':      { color: '#f0abfc', icon: '🔄',  tier: 1 },
  'task-orchestrator':         { color: '#d946ef', icon: '🎯',  tier: 1 },
  // Tier 2 — core dev
  coder:                       { color: '#3b82f6', icon: '💻',  tier: 2 },
  reviewer:                    { color: '#10b981', icon: '🔍',  tier: 2 },
  tester:                      { color: '#06b6d4', icon: '🧪',  tier: 2 },
  researcher:                  { color: '#f97316', icon: '🔬',  tier: 2 },
  'sparc-coder':               { color: '#60a5fa', icon: '🧠',  tier: 2 },
  'backend-dev':               { color: '#2563eb', icon: '⚙️',  tier: 2 },
  'mobile-dev':                { color: '#7c3aed', icon: '📱',  tier: 2 },
  'ml-developer':              { color: '#0891b2', icon: '🤖',  tier: 2 },
  // Tier 2 — security
  'security-architect':        { color: '#ef4444', icon: '🛡️',  tier: 2 },
  'security-auditor':          { color: '#dc2626', icon: '🔐',  tier: 2 },
  'security-manager':          { color: '#b91c1c', icon: '🔒',  tier: 2 },
  'pii-detector':              { color: '#f87171', icon: '🕵️',  tier: 2 },
  'injection-analyst':         { color: '#fca5a5', icon: '💉',  tier: 2 },
  // Tier 2 — memory & data
  'memory-specialist':         { color: '#ec4899', icon: '🧠',  tier: 2 },
  'memory-coordinator':        { color: '#db2777', icon: '💾',  tier: 2 },
  'swarm-memory-manager':      { color: '#be185d', icon: '🗄️',  tier: 2 },
  'crdt-synchronizer':         { color: '#9d174d', icon: '🔗',  tier: 2 },
  // Tier 2 — performance
  'performance-engineer':      { color: '#84cc16', icon: '⚡',  tier: 2 },
  'performance-optimizer':     { color: '#65a30d', icon: '📈',  tier: 2 },
  'perf-analyzer':             { color: '#4d7c0f', icon: '📊',  tier: 2 },
  'matrix-optimizer':          { color: '#3f6212', icon: '🔢',  tier: 2 },
  // Tier 2 — github
  'pr-manager':                { color: '#6366f1', icon: '🔀',  tier: 2 },
  'code-review-swarm':         { color: '#4f46e5', icon: '👀',  tier: 2 },
  'issue-tracker':             { color: '#4338ca', icon: '🐛',  tier: 2 },
  'release-manager':           { color: '#3730a3', icon: '🚀',  tier: 2 },
  'cicd-engineer':             { color: '#312e81', icon: '🔧',  tier: 2 },
  'workflow-automation':       { color: '#1d1b70', icon: '⚙️',  tier: 2 },
  // Tier 2 — SPARC
  specification:               { color: '#0ea5e9', icon: '📋',  tier: 2 },
  pseudocode:                  { color: '#0284c7', icon: '📝',  tier: 2 },
  architecture:                { color: '#0369a1', icon: '🏛️',  tier: 2 },
  refinement:                  { color: '#075985', icon: '✨',  tier: 2 },
  // Tier 2 — consensus & distributed
  'raft-manager':              { color: '#059669', icon: '🗳️',  tier: 2 },
  'quorum-manager':            { color: '#047857', icon: '⚖️',  tier: 2 },
  'byzantine-coordinator':     { color: '#065f46', icon: '🏛️',  tier: 2 },
  'consensus-coordinator':     { color: '#064e3b', icon: '🤝',  tier: 2 },
  'gossip-coordinator':        { color: '#022c22', icon: '💬',  tier: 2 },
  // Tier 2 — analysis & AI
  'pagerank-analyzer':         { color: '#b45309', icon: '📡',  tier: 2 },
  'trading-predictor':         { color: '#92400e', icon: '📉',  tier: 2 },
  'analyst':                   { color: '#78350f', icon: '📐',  tier: 2 },
  // Tier 2 — ops & infra
  'swarm-init':                { color: '#374151', icon: '🌐',  tier: 2 },
  'production-validator':      { color: '#1f2937', icon: '✅',  tier: 2 },
  'api-docs':                  { color: '#111827', icon: '📚',  tier: 2 },
  'adr-architect':             { color: '#6b7280', icon: '📒',  tier: 2 },
  'ddd-domain-expert':         { color: '#9ca3af', icon: '🗂️',  tier: 2 },
};

const STATUSES = ['idle', 'thinking', 'working', 'communicating', 'done'];

const TASKS = [
  'Analizuję strukturę kodu', 'Generuję testy jednostkowe', 'Przeglądam PR #2',
  'Szukam wzorców bezpieczeństwa', 'Optymalizuję zapytania', 'Synchronizuję pamięć',
  'Buduję plan implementacji', 'Weryfikuję dependencje', 'Refaktoryzuję moduł users',
  'Sprawdzam coverage testów', 'Analizuję metryki wydajności', 'Aktualizuję dokumentację',
  'Deploynuję na środowisko staging', 'Skanuje CVE w zależnościach', 'Mergeuję gałąź feature',
  'Tworzę ADR dla nowej architektury', 'Profiluję wydajność endpointów', 'Indeksuję HNSW wektory',
  'Koordynuję konsensus Raft', 'Wykrywam anomalie w logach', 'Generuję OpenAPI spec',
  'Uruchamiam pipeline CI/CD', 'Modeluję domenę DDD', 'Tworzę snapshot stanu agentów',
];

// ─── Helper: build the 60-agent network ──────────────────────────────────────
const RAND_STATUS = () => STATUSES[Math.floor(Math.random() * STATUSES.length)];
const RAND_TASK   = () => Math.random() > 0.3 ? TASKS[Math.floor(Math.random() * TASKS.length)] : null;

// prettier-ignore
const RAW_AGENTS = [
  // ── Tier 0 ──
  { id:'orch-1', name:'Master Orchestrator', type:'orchestrator', connections:[] },

  // ── Tier 1: coordinators ──
  { id:'plan-1',   name:'Planner Alpha',        type:'planner',                   connections:['orch-1'] },
  { id:'sparc-c',  name:'SPARC Coordinator',    type:'sparc-coord',               connections:['orch-1'] },
  { id:'hier-c',   name:'Hierarchical Coord',   type:'hierarchical-coordinator',  connections:['orch-1','plan-1'] },
  { id:'mesh-c',   name:'Mesh Coordinator',     type:'mesh-coordinator',          connections:['orch-1','hier-c'] },
  { id:'adapt-c',  name:'Adaptive Coordinator', type:'adaptive-coordinator',      connections:['orch-1','mesh-c'] },
  { id:'task-o',   name:'Task Orchestrator',    type:'task-orchestrator',         connections:['orch-1','plan-1'] },

  // ── Core dev cluster ──
  { id:'code-1',  name:'Coder Prime',        type:'coder',        connections:['hier-c','plan-1'] },
  { id:'code-2',  name:'Coder Beta',         type:'coder',        connections:['hier-c','code-1'] },
  { id:'code-3',  name:'Coder Gamma',        type:'coder',        connections:['hier-c','code-2'] },
  { id:'rev-1',   name:'Code Reviewer',      type:'reviewer',     connections:['code-1','code-2','hier-c'] },
  { id:'rev-2',   name:'PR Reviewer',        type:'reviewer',     connections:['code-3','rev-1'] },
  { id:'test-1',  name:'Unit Tester',        type:'tester',       connections:['code-1','rev-1'] },
  { id:'test-2',  name:'Integration Tester', type:'tester',       connections:['code-2','test-1'] },
  { id:'res-1',   name:'Researcher Alpha',   type:'researcher',   connections:['plan-1','sparc-c'] },
  { id:'res-2',   name:'Researcher Beta',    type:'researcher',   connections:['res-1','task-o'] },
  { id:'sparc-k', name:'SPARC Coder',        type:'sparc-coder',  connections:['sparc-c','code-1'] },
  { id:'back-1',  name:'Backend Dev',        type:'backend-dev',  connections:['hier-c','code-1','rev-1'] },
  { id:'mob-1',   name:'Mobile Dev',         type:'mobile-dev',   connections:['hier-c','back-1'] },
  { id:'ml-1',    name:'ML Developer',       type:'ml-developer', connections:['res-1','hier-c'] },

  // ── Security cluster ──
  { id:'sec-1',  name:'Security Architect', type:'security-architect', connections:['orch-1','hier-c'] },
  { id:'sec-2',  name:'Security Auditor',   type:'security-auditor',   connections:['sec-1','rev-1'] },
  { id:'sec-3',  name:'Security Manager',   type:'security-manager',   connections:['sec-1','orch-1'] },
  { id:'pii-1',  name:'PII Detector',       type:'pii-detector',       connections:['sec-1','code-1'] },
  { id:'inj-1',  name:'Injection Analyst',  type:'injection-analyst',  connections:['sec-1','pii-1'] },

  // ── Memory cluster ──
  { id:'mem-1', name:'Memory Specialist',   type:'memory-specialist',    connections:['orch-1','code-1'] },
  { id:'mem-2', name:'Memory Coordinator',  type:'memory-coordinator',   connections:['mem-1','hier-c'] },
  { id:'smm-1', name:'Swarm Memory Mgr',    type:'swarm-memory-manager', connections:['mem-1','orch-1'] },
  { id:'crd-1', name:'CRDT Synchronizer',   type:'crdt-synchronizer',    connections:['mem-1','smm-1','mesh-c'] },

  // ── Performance cluster ──
  { id:'perf-1', name:'Performance Engineer',  type:'performance-engineer',  connections:['hier-c','code-1'] },
  { id:'perf-2', name:'Performance Optimizer', type:'performance-optimizer', connections:['perf-1','back-1'] },
  { id:'perf-3', name:'Perf Analyzer',         type:'perf-analyzer',         connections:['perf-1','test-1'] },
  { id:'mat-1',  name:'Matrix Optimizer',      type:'matrix-optimizer',      connections:['perf-1','ml-1'] },

  // ── GitHub cluster ──
  { id:'pr-1',   name:'PR Manager',          type:'pr-manager',          connections:['hier-c','rev-1'] },
  { id:'crs-1',  name:'Code Review Swarm',   type:'code-review-swarm',   connections:['pr-1','rev-1','rev-2'] },
  { id:'iss-1',  name:'Issue Tracker',       type:'issue-tracker',       connections:['pr-1','task-o'] },
  { id:'rel-1',  name:'Release Manager',     type:'release-manager',     connections:['pr-1','orch-1'] },
  { id:'ci-1',   name:'CI/CD Engineer',      type:'cicd-engineer',       connections:['rel-1','test-1','test-2'] },
  { id:'wf-1',   name:'Workflow Automation', type:'workflow-automation',  connections:['ci-1','task-o'] },

  // ── SPARC cluster ──
  { id:'spec-1', name:'Specification Writer', type:'specification', connections:['sparc-c','plan-1'] },
  { id:'pse-1',  name:'Pseudocode Writer',    type:'pseudocode',    connections:['sparc-c','spec-1'] },
  { id:'arc-1',  name:'Architecture Agent',   type:'architecture',  connections:['sparc-c','pse-1'] },
  { id:'ref-1',  name:'Refinement Agent',     type:'refinement',    connections:['sparc-c','arc-1','code-1'] },

  // ── Consensus / distributed cluster ──
  { id:'raft-1',  name:'Raft Manager',          type:'raft-manager',          connections:['mesh-c','adapt-c'] },
  { id:'quo-1',   name:'Quorum Manager',         type:'quorum-manager',        connections:['raft-1','mesh-c'] },
  { id:'byz-1',   name:'Byzantine Coordinator',  type:'byzantine-coordinator', connections:['raft-1','quo-1'] },
  { id:'cons-1',  name:'Consensus Coordinator',  type:'consensus-coordinator', connections:['byz-1','orch-1'] },
  { id:'gos-1',   name:'Gossip Coordinator',     type:'gossip-coordinator',    connections:['mesh-c','cons-1'] },

  // ── Analysis / AI cluster ──
  { id:'pgr-1',  name:'PageRank Analyzer',  type:'pagerank-analyzer',  connections:['res-1','ml-1'] },
  { id:'trd-1',  name:'Trading Predictor',  type:'trading-predictor',  connections:['ml-1','perf-1'] },
  { id:'ana-1',  name:'Code Analyst',       type:'analyst',            connections:['rev-1','sec-1'] },

  // ── Ops / infra cluster ──
  { id:'swi-1',  name:'Swarm Init',            type:'swarm-init',          connections:['orch-1','hier-c'] },
  { id:'pv-1',   name:'Production Validator',  type:'production-validator',connections:['rel-1','test-2'] },
  { id:'doc-1',  name:'API Docs Agent',        type:'api-docs',            connections:['back-1','spec-1'] },
  { id:'adr-1',  name:'ADR Architect',         type:'adr-architect',       connections:['arc-1','orch-1'] },
  { id:'ddd-1',  name:'DDD Domain Expert',     type:'ddd-domain-expert',   connections:['plan-1','arc-1'] },
];

// Assign random initial status/task
let agents = RAW_AGENTS.map(a => ({
  ...a,
  status: a.id === 'orch-1' ? 'working' : RAND_STATUS(),
  task:   a.id === 'orch-1' ? 'Koordynuję sieć 60 agentów' : RAND_TASK(),
}));

// ─── Communication pairs (representative subset) ──────────────────────────────
const COMM_PAIRS = [
  ['orch-1','plan-1'], ['orch-1','hier-c'], ['orch-1','sec-3'], ['orch-1','smm-1'],
  ['plan-1','sparc-c'], ['plan-1','res-1'], ['plan-1','ddd-1'],
  ['hier-c','code-1'], ['hier-c','back-1'], ['hier-c','perf-1'],
  ['code-1','rev-1'], ['code-1','test-1'], ['code-1','mem-1'],
  ['code-2','rev-2'], ['code-3','test-2'],
  ['rev-1','pr-1'], ['pr-1','rel-1'], ['rel-1','ci-1'], ['ci-1','wf-1'],
  ['sec-1','pii-1'], ['sec-1','inj-1'], ['sec-2','ana-1'],
  ['mem-1','crd-1'], ['smm-1','crd-1'],
  ['perf-1','perf-2'], ['perf-2','mat-1'],
  ['sparc-c','spec-1'], ['spec-1','pse-1'], ['pse-1','arc-1'], ['arc-1','ref-1'],
  ['raft-1','quo-1'], ['byz-1','cons-1'], ['mesh-c','gos-1'],
  ['ml-1','pgr-1'], ['ml-1','trd-1'],
  ['task-o','iss-1'], ['adr-1','arc-1'], ['doc-1','spec-1'],
];

let messages = [];
let msgId = 0;

function getAgents()    { return agents; }
function getAgent(id)   { return agents.find(a => a.id === id); }
function updateAgent(id, patch) {
  agents = agents.map(a => a.id === id ? { ...a, ...patch } : a);
  return getAgent(id);
}
function addMessage(from, to, text) {
  const msg = { id: msgId++, from, to, text, ts: new Date().toISOString() };
  messages.push(msg);
  if (messages.length > 100) messages.shift();
  return msg;
}
function getMessages(limit = 30) { return messages.slice(-limit); }
function getSnapshot() {
  return { agents, messages: getMessages(), agentTypes: AGENT_TYPES, ts: new Date().toISOString() };
}

module.exports = { getAgents, getAgent, updateAgent, addMessage, getMessages, getSnapshot, AGENT_TYPES, STATUSES, TASKS, COMM_PAIRS };
