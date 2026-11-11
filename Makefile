# Run the Eco Data Extractor UI and API on localhost.
#
#   make            start both (Ctrl+C stops both)
#   make backend    API  at http://127.0.0.1:8000
#   make frontend   UI   at http://127.0.0.1:3000
#   make install    create the backend venv and install dependencies

.DEFAULT_GOAL := dev

BACKEND_HOST ?= 127.0.0.1
BACKEND_PORT ?= 8000
FRONTEND_HOST ?= 127.0.0.1
FRONTEND_PORT ?= 3000

.PHONY: help dev run backend frontend install

help:
	@printf '%s\n' \
		'make            Start the API and UI on localhost (Ctrl+C stops both)' \
		'make backend    API  at http://$(BACKEND_HOST):$(BACKEND_PORT)' \
		'make frontend   UI   at http://$(FRONTEND_HOST):$(FRONTEND_PORT)' \
		'make install    Install backend and frontend dependencies'

dev run:
	@printf '%s\n' \
		'Backend  http://$(BACKEND_HOST):$(BACKEND_PORT)  (docs at /docs)' \
		'Frontend http://$(FRONTEND_HOST):$(FRONTEND_PORT)' \
		'Press Ctrl+C to stop both.'
	@bash -c 'set -m; \
		pids=""; \
		cleanup() { \
			trap - INT TERM EXIT; \
			for pid in $$pids; do kill -TERM -$$pid 2>/dev/null || kill $$pid 2>/dev/null || true; done; \
			wait $$pids 2>/dev/null || true; \
		}; \
		trap cleanup INT TERM EXIT; \
		$(MAKE) --no-print-directory backend & pids="$$pids $$!"; \
		$(MAKE) --no-print-directory frontend & pids="$$pids $$!"; \
		wait || true'

backend:
	@test -x backend/.venv/bin/uvicorn || { \
		echo 'Missing backend/.venv. Run: make install'; \
		exit 1; \
	}
	cd backend && \
		if [ -f ../.env ]; then set -a; . ../.env; set +a; fi && \
		.venv/bin/uvicorn app.main:app --reload --host $(BACKEND_HOST) --port $(BACKEND_PORT)

frontend:
	@test -d frontend/node_modules || { \
		echo 'Missing frontend/node_modules. Run: make install'; \
		exit 1; \
	}
	cd frontend && npm run dev -- --host $(FRONTEND_HOST) --port $(FRONTEND_PORT) --strictPort

install:
	python3 -m venv backend/.venv
	backend/.venv/bin/pip install -r backend/requirements.txt
	cd frontend && npm install
