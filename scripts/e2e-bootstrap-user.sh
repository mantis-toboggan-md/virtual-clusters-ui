#!/usr/bin/env bash
set -e

# Creates a standard user with project and namespace resources in the downstream cluster.
# Mirrors the Cypress 'createUser' command and sub-commands
#
# Resources created:
#   - A project in the downstream cluster
#   - A namespace within that project
#   - A standard user
#   - Role bindings: 'virtual cluster admin' on the project
#   - Role bindings: 'view virtual cluster policies' in the downstream cluster

TEST_BASE_URL=${TEST_BASE_URL:-https://127.0.0.1.sslip.io}
CATTLE_BOOTSTRAP_PASSWORD=${CATTLE_BOOTSTRAP_PASSWORD:-password}
DOWNSTREAM_CLUSTER_ID=${DOWNSTREAM_CLUSTER_ID:-e2e-generic}
PROJECT_NAME=${PROJECT_NAME:-e2e-project}
NAMESPACE_NAME=${NAMESPACE_NAME:-e2e-namespace}
STANDARD_USER=${STANDARD_USER:-standard-user}
STANDARD_USER_PASSWORD=${STANDARD_USER_PASSWORD:-$CATTLE_BOOTSTRAP_PASSWORD}

# Get role names from role definition files
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROLE=$(grep -oP "name:\s*'\K[^']*" "$SCRIPT_DIR/../pkg/virtual-clusters/resources/virtual-cluster-admin-role.js" | head -1)
CLUSTER_ROLE=$(grep -oP "name:\s*'\K[^']*" "$SCRIPT_DIR/../pkg/virtual-clusters/resources/virtual-cluster-policy-read-role.js" | head -1)

if [ -z "$PROJECT_ROLE" ] || [ -z "$CLUSTER_ROLE" ]; then
  echo "Failed to extract role names from role definition files"
  exit 1
fi

echo "Using project role: ${PROJECT_ROLE}"
echo "Using cluster role: ${CLUSTER_ROLE}"

echo "Logging in as admin.........."
TOKEN=""
for i in $(seq 1 60); do
  TOKEN=$(curl -sk -X POST "${TEST_BASE_URL}/v3-public/localProviders/local?action=login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"admin\",\"password\":\"${CATTLE_BOOTSTRAP_PASSWORD}\"}" \
    | jq -r '.token // empty' 2>/dev/null || echo "")
  [ -n "$TOKEN" ] && break
  echo "  Login not ready yet... ($i/60)"
  sleep 5
done
if [ -z "$TOKEN" ]; then
  echo "Failed to obtain an admin token"
  exit 1
fi

echo "Creating project '${PROJECT_NAME}'.........."
PROJECT_RESP=$(curl -sk -X POST "${TEST_BASE_URL}/v3/projects" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"project\",\"name\":\"${PROJECT_NAME}\",\"annotations\":{},\"labels\":{},\"clusterId\":\"${DOWNSTREAM_CLUSTER_ID}\",\"creatorId\":\"${DOWNSTREAM_CLUSTER_ID}://admin\",\"containerDefaultResourceLimit\":{},\"resourceQuota\":{},\"namespaceDefaultResourceQuota\":{}}")

PROJECT_ID=$(echo "$PROJECT_RESP" | jq -r '.id // empty')
if [ -z "$PROJECT_ID" ]; then
  echo "Failed to create project. Response: ${PROJECT_RESP}"
  exit 1
fi
echo "Project ID: ${PROJECT_ID}"

echo "Creating namespace '${NAMESPACE_NAME}' in project.........."
NAMESPACE_RESP=$(curl -sk -X POST "${TEST_BASE_URL}/v1/namespaces" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"metadata\":{\"annotations\":{\"field.cattle.io/containerDefaultResourceLimit\":\"{}\",\"field.cattle.io/projectId\":\"${PROJECT_ID}\"},\"labels\":{\"field.cattle.io/projectId\":\"${PROJECT_ID##*:}\",\"pod-security.kubernetes.io/enforce\":\"privileged\",\"pod-security.kubernetes.io/enforce-version\":\"latest\"},\"name\":\"${NAMESPACE_NAME}\"},\"disableOpenApiValidation\":false}")

NAMESPACE_ID=$(echo "$NAMESPACE_RESP" | jq -r '.id // empty')
if [ -z "$NAMESPACE_ID" ]; then
  echo "Failed to create namespace. Response: ${NAMESPACE_RESP}"
  exit 1
fi

echo "Creating user '${STANDARD_USER}'.........."
USER_RESP=$(curl -sk -X POST "${TEST_BASE_URL}/v1/management.cattle.io.users" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"user\",\"enabled\":true,\"mustChangePassword\":false,\"username\":\"${STANDARD_USER}\"}")

USER_ID=$(echo "$USER_RESP" | jq -r '.id // empty')
if [ -z "$USER_ID" ]; then
  echo "Failed to create user. Response: ${USER_RESP}"
  exit 1
fi
echo "User ID: ${USER_ID}"

echo "Fetching user principal ID.........."
USER_PRINCIPAL_ID=""
for i in $(seq 1 10); do
  USER_DATA=$(curl -sk "${TEST_BASE_URL}/v1/management.cattle.io.users/${USER_ID}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")

  USER_PRINCIPAL_ID=$(echo "$USER_DATA" | jq -r '.principalIds[0] // empty')
  [ -n "$USER_PRINCIPAL_ID" ] && break
  echo "  Principal ID not ready yet... ($i/10)"
  sleep 1
done
if [ -z "$USER_PRINCIPAL_ID" ]; then
  echo "Failed to fetch user principal ID. Response: ${USER_DATA}"
  exit 1
fi
echo "User Principal ID: ${USER_PRINCIPAL_ID}"

echo "Creating password secret for user.........."
SECRET_RESP=$(curl -sk -X POST "${TEST_BASE_URL}/v1/secrets" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"secret\",\"metadata\":{\"namespace\":\"cattle-local-user-passwords\",\"name\":\"${USER_ID}\"},\"data\":{\"password\":\"$(echo -n "${STANDARD_USER_PASSWORD}" | base64)\"}}")

SECRET_ID=$(echo "$SECRET_RESP" | jq -r '.id // empty')
if [ -z "$SECRET_ID" ]; then
  echo "Failed to create password secret. Response: ${SECRET_RESP}"
  exit 1
fi

echo "Setting '${PROJECT_ROLE}' project role.........."
PROJECT_ROLE_RESP=$(curl -sk -X POST "${TEST_BASE_URL}/v3/projectroletemplatebindings" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"projectroletemplatebinding\",\"roleTemplateId\":\"${PROJECT_ROLE}\",\"userPrincipalId\":\"${USER_PRINCIPAL_ID}\",\"projectId\":\"${PROJECT_ID}\"}")

if [ -z "$(echo "$PROJECT_ROLE_RESP" | jq -r '.id // empty')" ]; then
  echo "Failed to set project role binding. Response: ${PROJECT_ROLE_RESP}"
  exit 1
fi

echo "Setting '${CLUSTER_ROLE}' cluster role.........."
CLUSTER_ROLE_RESP=$(curl -sk -X POST "${TEST_BASE_URL}/v3/clusterroletemplatebindings" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"clusterRoleTemplateBinding\",\"clusterId\":\"${DOWNSTREAM_CLUSTER_ID}\",\"roleTemplateId\":\"${CLUSTER_ROLE}\",\"userPrincipalId\":\"${USER_PRINCIPAL_ID}\"}")

if [ -z "$(echo "$CLUSTER_ROLE_RESP" | jq -r '.id // empty')" ]; then
  echo "Failed to set cluster role binding. Response: ${CLUSTER_ROLE_RESP}"
  exit 1
fi

echo "Verifying standard user can log in.........."
STANDARD_USER_TOKEN=""
for i in $(seq 1 10); do
  LOGIN_RESP=$(curl -sk -X POST "${TEST_BASE_URL}/v3-public/localProviders/local?action=login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${STANDARD_USER}\",\"password\":\"${STANDARD_USER_PASSWORD}\"}")

  STANDARD_USER_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.token // empty')
  [ -n "$STANDARD_USER_TOKEN" ] && break
  echo "  Login not ready yet... ($i/10)"
  sleep 1
done
if [ -z "$STANDARD_USER_TOKEN" ]; then
  echo "Failed to log in as standard user '${STANDARD_USER}'. Response: ${LOGIN_RESP}"
  exit 1
fi

echo "Standard user bootstrapped"
echo "  Username: ${STANDARD_USER}"
echo "  Project: ${PROJECT_NAME}"
echo "  Namespace: ${NAMESPACE_NAME}"
