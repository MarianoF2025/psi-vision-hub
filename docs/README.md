<p align="center">
  <img src="assets/logo/centralwap-logo.png" alt="Centralwap Logo" width="200">
</p>

<h1 align="center">Centralwap</h1>

<p align="center">
  <strong>Central de Comunicaciones WhatsApp para Equipos de Venta</strong>
</p>

<p align="center">
  <a href="#características">Características</a> •
  <a href="#arquitectura">Arquitectura</a> •
  <a href="#instalación">Instalación</a> •
  <a href="#documentación">Documentación</a> •
  <a href="#soporte">Soporte</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-Proprietary-red.svg" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg" alt="Node">
  <img src="https://img.shields.io/badge/next.js-14-black.svg" alt="Next.js">
</p>

---

## ¿Qué es Centralwap?

Centralwap es una **plataforma de gestión de comunicaciones WhatsApp** diseñada para empresas que venden por WhatsApp. Funciona como una **central telefónica digital** que:

| Problema | Solución Centralwap |
|----------|---------------------|
| Vendedores usando WhatsApp personal | Bandeja unificada para todo el equipo |
| Sin historial cuando rota personal | Historial permanente en la nube |
| No saben qué pasa con los leads | Métricas en tiempo real |
| Leads de Meta Ads sin seguimiento | Integración automática CTWA |
| Respuestas inconsistentes | Respuestas rápidas estandarizadas |

---

## Características

### CRM WhatsApp
- Bandeja de entrada unificada multi-línea
- Chat en tiempo real con multimedia
- Respuestas rápidas con variables
- Asignación de conversaciones entre agentes
- Panel de información del contacto

### Automatizaciones
- Menús interactivos IVR
- Integración Click-to-WhatsApp (Meta Ads)
- Derivación automática por área
- Autorespuestas fuera de horario

### Remarketing
- Segmentación de audiencias
- Campañas masivas controladas
- Tracking de entregas y lecturas

### Gestión de Grupos
- Administración de grupos WhatsApp
- Envío múltiple a grupos
- Límites anti-baneo automáticos

### Analytics
- Dashboard de métricas en tiempo real
- Reportes por agente, área y campaña
- Exportación Excel/PDF

---

## Arquitectura

> **"Por donde entra, sale"**
> Un mensaje que entra por una línea WhatsApp siempre sale por esa misma línea.

### Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| **Frontend** | Next.js 14, React, Tailwind CSS |
| **Backend** | Node.js, Express, TypeScript |
| **Base de Datos** | PostgreSQL (Supabase) |
| **WhatsApp** | Cloud API (Meta) + Evolution API |
| **Automatización** | n8n (self-hosted) |

### Módulos

| Módulo | Puerto | Descripción |
|--------|--------|-------------|
| **CRM** | 3001 | Interfaz de usuario para agentes |
| **Router** | 3002 | Enrutamiento de mensajes y menús IVR |
| **Automations** | 3003 | Menús CTWA y autorespuestas |
| **n8n** | 5678 | Workflows de automatización |

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [Overview](docs/01-producto/OVERVIEW.md) | Qué es y para quién |
| [Features](docs/01-producto/FEATURES.md) | Lista de funcionalidades |
| [Manual CRM](docs/02-usuario/MANUAL_CRM.md) | Guía para agentes |
| [Arquitectura](docs/03-tecnico/ARQUITECTURA_GENERAL.md) | Documentación técnica |
| [Instalación](docs/04-instalacion/INSTALLATION.md) | Guía de instalación |

---

## Casos de Uso

- **Educación Online**: Academias que venden cursos por WhatsApp
- **Equipos de Venta**: Empresas con múltiples vendedores
- **Atención al Cliente**: Organizaciones con múltiples áreas

---

## Contacto

- **Email:** contacto@emeautomations.com

---

<p align="center">
  <strong>Centralwap</strong> — Profesionalizá tu venta por WhatsApp
</p>
