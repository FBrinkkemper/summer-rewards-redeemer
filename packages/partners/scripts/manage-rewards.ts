import { ethers } from "ethers";
import yargs from "yargs";
import fs from "fs";

import { RewardsRedeemer__factory } from "typechain-types";
import { PoolRewardsDistributionResponse } from "common";
import "common/bootstrap-env";

// SETUP
if (!process.env.JSON_RPC_URL) {
  throw new Error("Please copy '.env.example' to '.env' and fill the JSON_RPC_URL variable");
}
if (!process.env.PRIVATE_KEY_DEPLOY) {
  throw new Error("Please copy '.env.example' to '.env' and fill the PRIVATE_KEY_DEPLOY variable");
}

const JsonRpcUrl = process.env.JSON_RPC_URL!;
const PrivKey = process.env.PRIVATE_KEY_DEPLOY!;

const SigningWallet = new ethers.Wallet(PrivKey, new ethers.providers.JsonRpcProvider(JsonRpcUrl));

async function addMerkleTreeRoot(argv: any) {
  if (!ethers.utils.isAddress(argv.redeemerAddress)) {
    throw new Error("Invalid partner address format");
  }
  if (!Number.isInteger(argv.weekId) || argv.weekId < 0) {
    throw new Error("Invalid week ID format");
  }

  if (!argv.merkleTreeRoot && !argv.userDataFile) {
    throw new Error("Either --merkleTreeRoot or --userDataFile must be provided");
  }

  let merkleTreeRoot: string;

  if (argv.userDataFile) {
    if (!fs.existsSync(argv.userDataFile)) {
      throw new Error(`User data file ${argv.userDataFile} does not exist`);
    }
    const userData = JSON.parse(fs.readFileSync(argv.userDataFile, "utf8")) as PoolRewardsDistributionResponse;

    merkleTreeRoot = userData.root;
  } else {
    if (!ethers.utils.isHexString(argv.merkleTreeRoot)) {
      throw new Error("Invalid merkle tree root format");
    }

    merkleTreeRoot = argv.merkleTreeRoot;
  }

  const redeemerInstance = new RewardsRedeemer__factory(SigningWallet).attach(argv.redeemerAddress);

  try {
    const tx = await redeemerInstance.addRoot(argv.weekId, merkleTreeRoot);
    tx.wait();
  } catch (error) {
    console.log(error);
    console.log("ERROR: Adding root to redeemer, please check logs above");
    process.exit(1);
  }

  console.log(`ROOT ${merkleTreeRoot} added for WEEK ID ${argv.weekId} in REDEEMER ${argv.redeemerAddress}`);
}

async function removeMerkleTreeRoot(argv: any) {
  if (!ethers.utils.isAddress(argv.redeemerAddress)) {
    throw new Error("Invalid partner address format");
  }
  if (!Number.isInteger(argv.weekId) || argv.weekId < 0) {
    throw new Error("Invalid week ID format");
  }

  const redeemerInstance = new RewardsRedeemer__factory(SigningWallet).attach(argv.redeemerAddress);

  try {
    const tx = await redeemerInstance.removeRoot(argv.weekId);
    tx.wait();
  } catch (error) {
    console.log(error);
    console.log("ERROR: Removing root from redeemer, please check logs above");
    process.exit(1);
  }

  console.log(`ROOT removed for WEEK ID ${argv.weekId} in REDEEMER ${argv.redeemerAddress}`);
}

async function getMerkleTreeRoot(argv: any) {
  if (!ethers.utils.isAddress(argv.redeemerAddress)) {
    throw new Error("Invalid partner address format");
  }
  if (!Number.isInteger(argv.weekId) || argv.weekId < 0) {
    throw new Error("Invalid week ID format");
  }

  const redeemerInstance = new RewardsRedeemer__factory(SigningWallet).attach(argv.redeemerAddress);

  const merkleTreeRoot = await redeemerInstance.getRoot(argv.weekId);

  console.log(
    `RETRIEVED ROOT ${merkleTreeRoot.toString()} for WEEK ID ${argv.weekId} from REDEEMER ${argv.redeemerAddress}`
  );
}

async function claimRewards(argv: any) {
  if (!ethers.utils.isAddress(argv.redeemerAddress)) {
    throw new Error("Invalid partner address format");
  }
  if (!Number.isInteger(argv.weekId) || argv.weekId < 0) {
    throw new Error("Invalid week ID format");
  }
  if (!argv.userDataFile) {
    throw new Error("A user data file must be provided");
  }
  if (!fs.existsSync(argv.userDataFile)) {
    throw new Error(`User data file ${argv.userDataFile} does not exist`);
  }

  const usersData = JSON.parse(fs.readFileSync(argv.userDataFile, "utf8")) as PoolRewardsDistributionResponse;

  const claimingUserData = usersData.parsedSnapshotWithProofs.filter(
    (entry) => entry.address === SigningWallet.address
  );
  if (!claimingUserData || claimingUserData.length === 0) {
    throw new Error(`User ${SigningWallet.address} not found in the user data file`);
  }
  if (claimingUserData.length > 1) {
    throw new Error(`User ${SigningWallet.address} found multiple times in the user data file`);
  }

  const redeemerInstance = new RewardsRedeemer__factory(SigningWallet).attach(argv.redeemerAddress);

  try {
    const tx = await redeemerInstance.claim(argv.weekId, claimingUserData[0].amount, claimingUserData[0].proof);
    tx.wait();
  } catch (error) {
    console.log(error);
    console.log("ERROR: Claiming rewards from redeemer, please check logs above");
    process.exit(1);
  }

  console.log(
    `CLAIMED ${claimingUserData[0].amount} for WEEK ID ${argv.weekId} in REDEEMER ${argv.redeemerAddress} for user ${SigningWallet.address}`
  );
}

async function main() {
  const argv = await yargs
    .command(
      "add",
      "Add rewards for a certain Week ID to the redeemer",
      {
        redeemerAddress: {
          alias: "r",
          description: "Redeemer address",
          type: "string",
          demandOption: true,
        },
        weekId: {
          alias: "w",
          description: "Week ID",
          type: "number",
          demandOption: true,
        },
        merkleTreeRoot: {
          alias: "m",
          description: "Merkle Tree Root",
          type: "string",
          demandOption: false,
        },
        userDataFile: {
          alias: "u",
          description: "User data file",
          type: "string",
          demandOption: false,
        },
      },
      addMerkleTreeRoot
    )
    .command(
      "remove",
      "Remove rewards for a certain Week ID from the redeemer",
      {
        redeemerAddress: {
          alias: "r",
          description: "Redeemer address",
          type: "string",
          demandOption: true,
        },
        weekId: {
          alias: "w",
          description: "Week ID",
          type: "number",
          demandOption: true,
        },
      },
      removeMerkleTreeRoot
    )
    .command(
      "get",
      "Retrieves the Merkle Tree root for a certain Week ID",
      {
        redeemerAddress: {
          alias: "a",
          description: "Redeemer address",
          type: "string",
          demandOption: true,
        },
        weekId: {
          alias: "w",
          description: "Week ID",
          type: "number",
          demandOption: true,
        },
      },
      getMerkleTreeRoot
    )
    .command(
      "claim",
      "Claims the rewards for a certain Week ID, intended for testing purposes. User address is taken from the configured private key",
      {
        redeemerAddress: {
          alias: "a",
          description: "Redeemer address",
          type: "string",
          demandOption: true,
        },
        weekId: {
          alias: "w",
          description: "Week ID",
          type: "number",
          demandOption: true,
        },
        userDataFile: {
          alias: "u",
          description: "User data file",
          type: "string",
          demandOption: false,
        },
      },
      claimRewards
    )
    .help()
    .alias("help", "h").argv;

  if (argv._.length === 0 || !["add", "remove", "get"].includes(argv._[0] as string)) {
    yargs.showHelp();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
