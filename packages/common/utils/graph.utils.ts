import { getBuiltGraphSDK } from "graphclient";
import { config } from "../config/config";
import { DistributionWithNetwork } from "../types";

export const graphClient = getBuiltGraphSDK({
  url: config.subgraphUrl,
});
export async function fetchDailyData(dayId: number, distribution: DistributionWithNetwork[]) {
  try {
    const pools = distribution
      .filter((pool) => pool.network == config.network)
      .map((pool) => pool.address.toLowerCase());
    const res = await graphClient.DailyPartnerRewards(
      { day: dayId.toString(), pools },
      {
        url: config.subgraphUrl,
      }
    );
    return res;
  } catch (error) {
    throw new Error(`Error fetching daily data for day ${dayId}: ${error}. Graph client error.`);
  }
}

export async function fetchWeeklyData(weekId: number, distribution: DistributionWithNetwork[]) {
  try {
    // filter out pools that are not on the network we are processing
    console.debug(`Fetching weekly data for week ${weekId} using ${config.subgraphUrl}`)
    const pools = distribution
      .filter((pool) => pool.network == config.network)
      .map((pool) => pool.address.toLowerCase());
    const res = await graphClient.WeeklyPartnerRewards(
      { week: weekId.toString(), pools },
      {
        url: config.subgraphUrl,
      }
    );
    return res;
  } catch (error) {
    throw new Error(`Error fetching weekly data for week ${weekId}: ${error}. Graph client error.`);
  }
}
