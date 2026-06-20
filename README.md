<div align="center">

# 🎮 AI Maze Runner

### Intelligent Pathfinding • Procedural Mazes • Stealth Gameplay • FSM-Based Enemy AI

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)
![HTML5](https://img.shields.io/badge/HTML5-Game-orange)
![CSS3](https://img.shields.io/badge/CSS3-UI-blue)
![Status](https://img.shields.io/badge/Status-Completed-brightgreen)
![License](https://img.shields.io/badge/License-MIT-green)

An advanced browser-based maze escape game that combines **Artificial Intelligence**, **Procedural Generation**, and **Strategic Gameplay** to deliver a challenging and immersive player experience.

</div>

---

## 📖 About The Project

AI Maze Runner is a modern maze-escape game built entirely with vanilla JavaScript. Players must navigate through dynamically generated mazes while avoiding intelligent enemy units powered by Finite State Machines (FSM) and pathfinding algorithms.

Unlike traditional maze games, enemy behavior adapts to player actions through multiple AI states such as patrol, chase, search, investigate, and attack, creating a more realistic and engaging challenge.

---

## ✨ Key Highlights

🔹 Intelligent Enemy AI using FSM Architecture

🔹 Dynamic Pathfinding and Navigation Systems

🔹 Procedural Maze Generation

🔹 Fog of War Exploration

🔹 Achievement & Progression Systems

🔹 Inventory and Upgrade Shop

🔹 Save/Load Functionality

🔹 Modular and Scalable Game Architecture

🔹 Object Pooling for Performance Optimization

---

## 🎯 Gameplay Preview

### Main Objective

Escape the maze while avoiding enemy units.

### Challenges

- Limited visibility
- Intelligent enemy pursuit
- Increasing difficulty levels
- Strategic resource management

### Victory Condition

Reach the exit without being captured.

---

## 🏗️ System Architecture

```text
Player
   │
   ▼
Input System
   │
   ▼
Game Engine
   │
 ┌─┴──────────┐
 ▼            ▼
AI System   UI System
 ▼            ▼
FSM       HUD / Menus
 ▼
Pathfinding
 ▼
Enemy Actions
```

---

## 🤖 Enemy AI States

| State | Description |
|---------|-------------|
| Patrol | Follows predefined routes |
| Investigate | Checks suspicious activity |
| Search | Looks for the player nearby |
| Chase | Pursues the detected player |
| Attack | Engages when within range |
| Return | Returns to patrol route |

---

## 🧠 Technical Concepts

### Artificial Intelligence
- Finite State Machines (FSM)
- Decision-Based Behaviors
- Dynamic State Transitions

### Algorithms
- Pathfinding Systems
- Graph Traversal Concepts
- Procedural Maze Generation

### Software Engineering
- Modular Architecture
- Event-Driven Communication
- Object-Oriented Programming

### Performance
- Object Pooling
- Optimized Rendering
- Efficient Memory Usage

---

## 📂 Project Structure

```text
src/
│
├── ai/
│   ├── FSM.js
│   ├── PathfindingSystem.js
│   └── states/
│
├── engine/
├── entities/
├── level/
├── save/
├── systems/
├── ui/
└── utils/
```

---

## 🚀 Running the Project

### Clone Repository

```bash
git clone https://github.com/yourusername/AI-Maze-Runner.git
```

### Navigate to Project

```bash
cd AI-Maze-Runner
```

### Launch

Open `index.html` in your browser.

---

## 📸 Screenshots

> Add gameplay screenshots here for maximum impact.

### Main Menu

![Main Menu](screenshots/menu.png)

### Gameplay

![Gameplay](screenshots/gameplay.png)

### Enemy AI

![Enemy AI](screenshots/ai.png)

---

## 🔮 Future Roadmap

- Multiplayer Support
- Advanced Enemy Types
- Boss Encounters
- Online Leaderboards
- Audio Enhancements
- Mobile Compatibility
- Additional Maze Themes

---

## 👨‍💻 Developer

**Prakul Dhiman**

B.Tech Computer Science Engineering  
Lovely Professional University

### Areas of Interest

- Game Development
- Artificial Intelligence
- Software Engineering
- Interactive Systems

---

<div align="center">

### ⭐ If you found this project interesting, consider starring the repository.

Built with passion for Game Development and AI.

</div>
