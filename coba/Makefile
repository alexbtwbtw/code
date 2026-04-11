.DEFAULT_GOAL := help

# ── Help ───────────────────────────────────────────────────────────────────────

.PHONY: help
help:
	@echo ""
	@echo "  COBA — project management app"
	@echo ""
	@echo "  Development"
	@echo "    make dev              Start backend + frontend dev servers"
	@echo "    make dev-backend      Start backend only  (port 3000)"
	@echo "    make dev-frontend     Start frontend only (port 5173)"
	@echo "    make electron-dev     Start full stack + Electron window"
	@echo ""
	@echo "  Build"
	@echo "    make build            Build backend + frontend"
	@echo "    make build-backend    Build backend only"
	@echo "    make build-frontend   Build frontend only"
	@echo ""
	@echo "  Electron"
	@echo "    make electron-build   Full Electron app build → dist-electron/"
	@echo "    make electron-pack    Assemble only (skip full rebuild)"
	@echo ""
	@echo "  Code quality"
	@echo "    make lint             Lint frontend"
	@echo "    make typecheck        Type-check backend + frontend"
	@echo ""
	@echo "  Maintenance"
	@echo "    make install          Install all dependencies"
	@echo "    make clean            Remove all build artefacts"
	@echo "    make env              Copy backend/.env.example → backend/.env"
	@echo ""

# ── Development ────────────────────────────────────────────────────────────────

.PHONY: dev
dev:
	npm run dev

.PHONY: dev-backend
dev-backend:
	npm run dev:backend

.PHONY: dev-frontend
dev-frontend:
	npm run dev:frontend

.PHONY: electron-dev
electron-dev:
	npm run electron:dev

# ── Build ──────────────────────────────────────────────────────────────────────

.PHONY: build
build:
	npm run build

.PHONY: build-backend
build-backend:
	npm --prefix backend run build

.PHONY: build-frontend
build-frontend:
	npm --prefix frontend run build

# ── Electron ───────────────────────────────────────────────────────────────────

.PHONY: electron-build
electron-build:
	npm run electron:build

.PHONY: electron-pack
electron-pack:
	npm run electron:pack

# ── Code quality ───────────────────────────────────────────────────────────────

.PHONY: lint
lint:
	npm --prefix frontend run lint

.PHONY: typecheck
typecheck:
	npm --prefix backend  run build -- --noEmit 2>/dev/null || npx --prefix backend tsc --noEmit
	npm --prefix frontend run build -- --noEmit 2>/dev/null || npx --prefix frontend tsc --noEmit

# ── Maintenance ────────────────────────────────────────────────────────────────

.PHONY: install
install:
	npm install
	npm --prefix backend  install
	npm --prefix frontend install

.PHONY: clean
clean:
	rm -rf backend/dist frontend/dist electron-dist dist-electron
	@echo "Build artefacts removed."

.PHONY: env
env:
	@if [ -f backend/.env ]; then \
		echo "backend/.env already exists — skipping."; \
	else \
		cp backend/.env.example backend/.env; \
		echo "Created backend/.env — add your ANTHROPIC_API_KEY."; \
	fi
