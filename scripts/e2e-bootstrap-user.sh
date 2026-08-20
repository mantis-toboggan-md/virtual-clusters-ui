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

PROJECT_ID=$(echo "$PROJECT_RESP" | jq -r '.id')
echo "Project ID: ${PROJECT_ID}"

echo "Creating namespace '${NAMESPACE_NAME}' in project.........."
curl -sk -X POST "${TEST_BASE_URL}/v1/namespaces" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"metadata\":{\"annotations\":{\"field.cattle.io/containerDefaultResourceLimit\":\"{}\",\"field.cattle.io/projectId\":\"${PROJECT_ID}\"},\"labels\":{\"field.cattle.io/projectId\":\"${PROJECT_ID##*:}\",\"pod-security.kubernetes.io/enforce\":\"privileged\",\"pod-security.kubernetes.io/enforce-version\":\"latest\"},\"name\":\"${NAMESPACE_NAME}\"},\"disableOpenApiValidation\":false}" > /dev/null

echo "Creating user '${STANDARD_USER}'.........."
USER_RESP=$(curl -sk -X POST "${TEST_BASE_URL}/v1/management.cattle.io.users" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"user\",\"enabled\":true,\"mustChangePassword\":false,\"username\":\"${STANDARD_USER}\"}")

USER_ID=$(echo "$USER_RESP" | jq -r '.id')
echo "User ID: ${USER_ID}"

# Wait for user to be fully created
sleep 1

echo "Fetching user principal ID.........."
USER_DATA=$(curl -sk "${TEST_BASE_URL}/v1/management.cattle.io.users/${USER_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

USER_PRINCIPAL_ID=$(echo "$USER_DATA" | jq -r '.principalIds[0]')
echo "User Principal ID: ${USER_PRINCIPAL_ID}"

echo "Creating password secret for user.........."
curl -sk -X POST "${TEST_BASE_URL}/v1/secrets" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"secret\",\"metadata\":{\"namespace\":\"cattle-local-user-passwords\",\"name\":\"${USER_ID}\"},\"data\":{\"password\":\"$(echo -n "${STANDARD_USER_PASSWORD}" | base64)\"}}" > /dev/null

echo "Setting '${PROJECT_ROLE}' project role.........."
curl -sk -X POST "${TEST_BASE_URL}/v3/projectroletemplatebindings" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"projectroletemplatebinding\",\"roleTemplateId\":\"${PROJECT_ROLE}\",\"userPrincipalId\":\"${USER_PRINCIPAL_ID}\",\"projectId\":\"${PROJECT_ID}\"}" > /dev/null

echo "Setting '${CLUSTER_ROLE}' cluster role.........."
curl -sk -X POST "${TEST_BASE_URL}/v3/clusterroletemplatebindings" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"clusterRoleTemplateBinding\",\"clusterId\":\"${DOWNSTREAM_CLUSTER_ID}\",\"roleTemplateId\":\"${CLUSTER_ROLE}\",\"userPrincipalId\":\"${USER_PRINCIPAL_ID}\"}" > /dev/null

echo "Standard user bootstrapped"
echo "  Username: ${STANDARD_USER}"
echo "  Project: ${PROJECT_NAME}"
echo "  Namespace: ${NAMESPACE_NAME}"
