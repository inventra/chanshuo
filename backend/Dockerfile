# 🏕️ 蟬說露營區管理系統 - 後端Docker配置
FROM python:3.11.9-slim

# 設置工作目錄
WORKDIR /app

# 設置環境變量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    TZ=Asia/Taipei

# 安裝系統依賴和時區設置
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

# 創建應用用戶和目錄
RUN useradd --create-home --shell /bin/bash app_user && \
    mkdir -p /app/logs /app/uploads && \
    chown -R app_user:app_user /app

# 複製requirements.txt並安裝Python依賴
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 複製應用代碼
COPY --chown=app_user:app_user app/ ./app/
COPY --chown=app_user:app_user database/ ./database/
COPY --chown=app_user:app_user data/ ./data/

# 切換到非root用戶
USER app_user

# 暴露端口
EXPOSE $PORT

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# 啟動命令
CMD ["sh", "-c", "cd app && uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1"]
