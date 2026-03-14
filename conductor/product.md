# Initial Concept
A bridge between Obsidian and OBS.

# Product Definition: Slides Studio

## Overview
Slides Studio is a powerful, unified OBS control hub integrated directly into Obsidian. It serves as a sophisticated bridge between live presentations, streaming software, and hardware controllers, designed specifically for live streamers, educators, and power users who want professional-grade production control from their notes.

## Core Focus
The product centers on three key pillars:
- **Slide Syncing**: Seamless, real-time synchronization between Obsidian slide changes and OBS scene transitions.
- **Hardware Control**: Low-latency, bidirectional communication with external devices via MIDI and OSC.
- **Smart Automation**: A robust, multi-protocol automation engine. Beyond custom slide tags, it features a dynamic **Rule Engine** that monitors any system channel (MIDI, OSC, OBS, Inputs) and triggers sequences of delayed actions to orchestrate complex production workflows.

## Target Audience
- **Live Streamers & Educators**: Presenters who need to manage complex OBS layouts, camera angles, and live content without leaving their presentation environment.

## Key Features & Integrations
Slides Studio leverages a modern, high-performance architecture powered by **SocketCluster** to provide:
- **Integrated Reveal.js App**: A built-in `slide-studio-app` for professional slide delivery and real-time state management.
- **Multi-protocol Support**: Native bridging for OSC, MIDI, and UVC devices via a unified SocketCluster messaging system.
- **Real-time Event Streaming**: A centralized SocketCluster server for system-wide status, monitor data, and high-frequency hardware communication.
- **Input Monitoring**: Python-based monitors for global mouse and keyboard tracking, integrated into the SocketCluster network.

## Future Vision
The long-term goal is to establish Slides Studio as the **Unified Controller** for Obsidian-based production, becoming the definitive hub for any creator looking to automate and control their broadcast environment through the power of structured notes.
