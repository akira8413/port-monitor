.PHONY: ports

ports: ## Launch port monitor dashboard (http://localhost:9999)
	@node scripts/port-monitor.js
