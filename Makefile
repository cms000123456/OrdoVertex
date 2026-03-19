.PHONY: help start stop restart logs build migrate

help:
	@echo "OrdoVertex - Available commands:"
	@echo "  make start    - Start all services with Docker Compose"
	@echo "  make stop     - Stop all services"
	@echo "  make restart  - Restart all services"
	@echo "  make logs     - View logs from all services"
	@echo "  make build    - Build Docker images"
	@echo "  make migrate  - Run database migrations"
	@echo "  make clean    - Remove all containers and volumes"

start:
	docker-compose up -d
	@echo "✅ OrdoVertex is starting..."
	@echo "📱 Frontend: http://localhost:3000"
	@echo "🔌 API: http://localhost:3001"

stop:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

build:
	docker-compose build

migrate:
	docker-compose exec api npx prisma migrate dev

shell-api:
	docker-compose exec api sh

shell-frontend:
	docker-compose exec frontend sh

clean:
	docker-compose down -v
	docker-compose rm -f
