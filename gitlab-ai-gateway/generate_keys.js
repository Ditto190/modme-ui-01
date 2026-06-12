const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const targetDir = __dirname;

function generateKeyPairs(prefix) {
  const { privateKey: signKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
  });

  const { privateKey: valKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
  });

  if (prefix === 'duo_workflow') {
      fs.writeFileSync(path.join(targetDir, `duo_workflow_jwt.key`), signKey);
      fs.writeFileSync(path.join(targetDir, `duo_workflow_validation.key`), valKey);
      return { signKey, valKey };
  } else {
      fs.writeFileSync(path.join(targetDir, `${prefix}_signing.key`), signKey);
      fs.writeFileSync(path.join(targetDir, `${prefix}_validation.key`), valKey);
      return { signKey, valKey };
  }
}

const duoKeys = generateKeyPairs('duo_workflow');
const aigwKeys = generateKeyPairs('aigw');

// Create .env file with actual keys
const envContent = `AIGW_GITLAB_URL=https://gitlab.com
AIGW_GITLAB_API_URL=https://gitlab.com/api/v4/
AIGW_SELF_SIGNED_JWT__SIGNING_KEY="${aigwKeys.signKey.replace(/\n/g, '\\n')}"
AIGW_SELF_SIGNED_JWT__VALIDATION_KEY="${aigwKeys.valKey.replace(/\n/g, '\\n')}"
DUO_WORKFLOW_AUTH__ENABLED="true"
DUO_WORKFLOW_SELF_SIGNED_JWT__SIGNING_KEY="${duoKeys.signKey.replace(/\n/g, '\\n')}"
DUO_WORKFLOW_SELF_SIGNED_JWT__VALIDATION_KEY="${duoKeys.valKey.replace(/\n/g, '\\n')}"
`;

fs.writeFileSync(path.join(targetDir, '.env'), envContent);

console.log('Successfully generated keys and configuration inside gitlab-ai-gateway directory.');
