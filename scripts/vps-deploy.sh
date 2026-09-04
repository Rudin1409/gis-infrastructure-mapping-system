#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_ROOT="${GIS_DEPLOY_ROOT:-/home/admin/gis-deploy}"
RELEASES_DIR="${DEPLOY_ROOT}/releases"
SHARED_DIR="${DEPLOY_ROOT}/shared"
INCOMING_DIR="${DEPLOY_ROOT}/incoming"
CURRENT_LINK="${DEPLOY_ROOT}/current"
LEGACY_ENV_FILE="/home/admin/gis-app/.env.local"
SHARED_ENV_FILE="${SHARED_DIR}/.env.local"
ARCHIVE_PATH="${1:-}"
RELEASE_ID="${2:-}"

fail() {
  printf 'Deployment failed: %s\n' "$1" >&2
  exit 1
}

case "$DEPLOY_ROOT" in
  /home/admin/gis-deploy) ;;
  *) fail "GIS_DEPLOY_ROOT must be /home/admin/gis-deploy" ;;
esac

[[ "$RELEASE_ID" =~ ^[0-9a-f]{7,40}$ ]] || fail "invalid release id"
[[ -f "$ARCHIVE_PATH" ]] || fail "release archive not found"

mkdir -p "$RELEASES_DIR" "$SHARED_DIR" "$INCOMING_DIR" "${DEPLOY_ROOT}/logs"

RESOLVED_ARCHIVE="$(realpath "$ARCHIVE_PATH")"
case "$RESOLVED_ARCHIVE" in
  "${INCOMING_DIR}"/*) ;;
  *) fail "release archive must be inside ${INCOMING_DIR}" ;;
esac

RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"

PREVIOUS_RELEASE=""
if [[ -L "$CURRENT_LINK" ]]; then
  PREVIOUS_RELEASE="$(realpath "$CURRENT_LINK")"
fi

if [[ -e "$RELEASE_DIR" ]]; then
  if [[ "$PREVIOUS_RELEASE" == "$RELEASE_DIR" ]]; then
    fail "release ${RELEASE_ID} is already active"
  fi

  case "$RELEASE_DIR" in
    "${RELEASES_DIR}"/*) rm -rf -- "$RELEASE_DIR" ;;
    *) fail "release directory is outside ${RELEASES_DIR}" ;;
  esac
fi

echo "==> [1/5] Mengekstrak release archive..."
mkdir -p "$RELEASE_DIR"
tar -xzf "$RESOLVED_ARCHIVE" -C "$RELEASE_DIR"

if [[ ! -f "$SHARED_ENV_FILE" ]]; then
  [[ -f "$LEGACY_ENV_FILE" ]] || fail "production .env.local is missing"
  cp "$LEGACY_ENV_FILE" "$SHARED_ENV_FILE"
  chmod 600 "$SHARED_ENV_FILE"
fi

ln -s "$SHARED_ENV_FILE" "${RELEASE_DIR}/.env.local"

cd "$RELEASE_DIR"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"

echo "==> [2/5] Menginstal dependensi di VPS (npm ci)..."
npm ci --no-audit --no-fund

echo "==> [3/5] Membangun bundle produksi Next.js (npm run build)..."
npm run build

echo "==> [4/5] Membersihkan dev dependencies (npm prune)..."
npm prune --omit=dev --no-audit --no-fund

echo "==> [5/5] Mengalihkan ke rilis baru & merestart PM2..."
NEXT_LINK="${DEPLOY_ROOT}/current.next"
rm -f "$NEXT_LINK"
ln -s "$RELEASE_DIR" "$NEXT_LINK"
mv -Tf "$NEXT_LINK" "$CURRENT_LINK"

rollback() {
  if [[ -n "$PREVIOUS_RELEASE" && -d "$PREVIOUS_RELEASE" ]]; then
    rm -f "$NEXT_LINK"
    ln -s "$PREVIOUS_RELEASE" "$NEXT_LINK"
    mv -Tf "$NEXT_LINK" "$CURRENT_LINK"
    pm2 delete gis-app || true
    pm2 start "${CURRENT_LINK}/ecosystem.config.cjs" --update-env
  else
    pm2 stop gis-app || true
  fi
}

pm2 delete gis-app || true
if ! pm2 start "${CURRENT_LINK}/ecosystem.config.cjs" --update-env; then
  rollback
  fail "PM2 could not start the new release"
fi

echo "==> Menjalankan healthcheck server (http://127.0.0.1:3000)..."
HEALTHY=false
for _ in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3000/ >/dev/null; then
    HEALTHY=true
    break
  fi
  sleep 2
done

if [[ "$HEALTHY" != "true" ]]; then
  rollback
  fail "health check failed; previous release restored"
fi

pm2 save
rm -f "$RESOLVED_ARCHIVE"

mapfile -t OLD_RELEASES < <(
  find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' |
    sort -nr |
    tail -n +6 |
    cut -d' ' -f2-
)

for OLD_RELEASE in "${OLD_RELEASES[@]}"; do
  case "$OLD_RELEASE" in
    "${RELEASES_DIR}"/*) rm -rf -- "$OLD_RELEASE" ;;
  esac
done

printf 'Deployment %s completed successfully.\n' "$RELEASE_ID"
