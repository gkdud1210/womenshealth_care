
#!/bin/bash
# Start Next.js dev server and open browser when ready

PORT=${PORT:-3000}

npx next dev --port $PORT &
SERVER_PID=$!

# Wait until the server responds, then open browser
until curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT | grep -q "200"; do
  sleep 0.5
done

open "http://localhost:$PORT"

# Keep script alive (exit when server stops)
wait $SERVER_PID
