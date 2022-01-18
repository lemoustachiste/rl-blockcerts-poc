import { generateEncodedList } from './generateList';

const fs = require('fs');
const path = require('path');
const jsigs = require('jsonld-signatures');
const {purposes: {AssertionProofPurpose}} = jsigs;
const { Ed25519VerificationKey2020 } = require('@digitalbazaar/ed25519-verification-key-2020');
const { Ed25519Signature2020 } = require('@digitalbazaar/ed25519-signature-2020');
import { securityLoader } from '@digitalbazaar/security-document-loader';
import revocationList2020Context from './contexts/revocation-list-2020.json';
import prettyFormat from "./helpers/prettyFormat";

interface IRevocationList2021VerifiableCredential {
  '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/vc-revocation-list-2020/v1'], // TODO: update with 2021
  id: string;
  issuer: string; // or Issuer Object
  issuanceDate: string;
  type: ['VerifiableCredential', 'RevocationList2021Credential'],
  credentialSubject: {
    id: string;
    type: 'RevocationList2021',
    encodedList: string;
  }
}

interface IEd25519VerificationKey2020 {
  id?: string,
  controller?: string,
  revoked?: string,
  type: 'Ed25519VerificationKey2020',
  publicKeyMultibase: string,
  privateKeyMultibase: string
}

function getVCTemplate ({
  encodedList,
  id = ''
                        }: {
  encodedList: string,
  id?: string
}): IRevocationList2021VerifiableCredential {
  return {
    '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/vc-revocation-list-2020/v1'],
    id,
    issuer: '',
    issuanceDate: '',
    type: ['VerifiableCredential', 'RevocationList2021Credential'],
    credentialSubject: {
      id: `${id}#list`,
      type: 'RevocationList2021',
      encodedList,
    }
  };
}

function generateDocumentLoader () {
  const documentLoader = securityLoader();
  documentLoader.addStatic('https://w3id.org/vc-revocation-list-2020/v1', revocationList2020Context);
  return documentLoader.build();
}

async function generateKeyPair (): Promise<IEd25519VerificationKey2020> {
  const keyPair = await Ed25519VerificationKey2020.generate();
  return keyPair;
}

async function generateCredential (): Promise<IRevocationList2021VerifiableCredential> {
  const encodedBitStringList = await generateEncodedList();
  const credential = getVCTemplate({
    encodedList: encodedBitStringList
  });
  return credential;
}

async function writeFile (fileContent: any, fileName: string = 'revocationList') {
  const outputPath: string = path.join(process.cwd(), 'src', 'data', `${fileName}.json`);
  await fs.writeFile(outputPath, prettyFormat(fileContent), (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`file saved to file ${outputPath}`);
  });
}

async function createVCRevocationList () {
  const keyPair = await generateKeyPair(); // TODO: allow passing existing key
  await writeFile(keyPair, 'keyPair');
  const currentTime = new Date(Date.now()).toISOString();
  const suite = new Ed25519Signature2020({ key: keyPair });
  suite.date = currentTime;
  const credential = await generateCredential();
  credential.issuanceDate = currentTime;
  const signedCredential = await jsigs.sign(credential, {
    suite,
    purpose: new AssertionProofPurpose(),
    documentLoader: generateDocumentLoader()
  });
  console.log('credential', signedCredential);
  await writeFile(signedCredential);
}
createVCRevocationList();