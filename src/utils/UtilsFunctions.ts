import moment, { Moment } from "moment"
import { encodeAddress } from "@polkadot/util-crypto/address"
import { BN, BN_THOUSAND, BN_TWO } from "@polkadot/util"
import { SubstrateAddress, TransformedSubstrateAddress } from "../types"
import * as prefixes from "../utils/ss58-registry.json"
import { ApiPromise } from "@polkadot/api"

export const replaceText = (
  key: string,
  value: string,
  options: { ns: string; replace: Record<string, string> }
): string => {
  if (options.replace) {
    let newValue = value
    for (const key in options.replace) {
      newValue = newValue.replace(`{{${key}}}`, options.replace[key])
    }
    return newValue
  }
  return value || key
}

export const transformDate = (
  unixTimestamp: number,
  transformUtc: boolean
): Moment => {
  let auxMoment
  if (transformUtc) {
    auxMoment = moment.utc(unixTimestamp)
  } else {
    auxMoment = moment(unixTimestamp)
  }
  return auxMoment
}

export const formatDate = (
  unixTimestamp: number,
  transformUtc: boolean,
  format = "YYYY-MM-DD HH:mm:ss"
): string => {
  return transformDate(unixTimestamp, transformUtc).format(format)
}

export const toUnixTimestamp = (
  dateTime: Moment,
  transformUtc: boolean
): number => {
  const simpleDateTime = dateTime.format("YYYY-MM-DD HH:mm:ss")
  let timestamp
  if (transformUtc) {
    timestamp = moment.utc(simpleDateTime)
  } else {
    timestamp = moment(simpleDateTime)
  }
  return timestamp.valueOf()
}

export const transformAddress = (
  key: string
): TransformedSubstrateAddress[] => {
  const publicKey = Uint8Array.from(Buffer.from(key.substring(2), "hex"))
  const newFormats: TransformedSubstrateAddress[] = []
  for (const auxPrefix of prefixes.registry) {
    if (auxPrefix.prefix !== 46 && auxPrefix.prefix !== 47) {
      newFormats.push({
        prefix: auxPrefix.prefix,
        value: encodeAddress(publicKey, auxPrefix.prefix),
      })
    }
  }
  return newFormats
}

export const findAuthorName = (
  savedAddresses: SubstrateAddress[],
  address: string
): string | undefined => {
  for (const auxAddress of savedAddresses) {
    for (const auxTransformed of auxAddress.transformed) {
      if (auxTransformed.value === address) {
        return auxAddress.name
      }
    }
  }
  return undefined
}

export const estimateStartBlockNumber = (
  endBlockNumber: number,
  estimatedBlockTime: number,
  hours = 0,
  days = 0,
  weeks = 0,
  months = 0
): number => {
  const auxMoment = moment()
  const currentUnix = auxMoment.valueOf()
  hours && auxMoment.subtract(hours, "hours")
  days && auxMoment.subtract(days, "days")
  weeks && auxMoment.subtract(weeks, "weeks")
  months && auxMoment.subtract(months, "months")
  const estimatedUnix = auxMoment.valueOf()

  return Math.max(
    1,
    endBlockNumber - (currentUnix - estimatedUnix) / estimatedBlockTime
  )
}

const EXPECTED_TIME_THRESHOLD = BN_THOUSAND.div(BN_TWO)

const EXPECTED_TIME_DEFAULT = new BN(6_000)

export const getExpectedBlockTime = (api: ApiPromise): number => {
  // https://github.com/polkadot-js/apps/blob/8ef4ed18dd281adfef3ce9e8f0bede8a82e62ec9/packages/react-hooks/src/useBlockTime.ts#L26
  return (
    // Babe
    (
      api.consts.babe?.expectedBlockTime ||
      // POW, eg. Kulupu
      api.consts.difficulty?.targetBlockTime ||
      // Check against threshold to determine value validity
      (api.consts.timestamp?.minimumPeriod.gte(EXPECTED_TIME_THRESHOLD)
        ? // Default minimum period config
          api.consts.timestamp.minimumPeriod.mul(BN_TWO)
        : api.query.parachainSystem
        ? // default guess for a parachain
          EXPECTED_TIME_DEFAULT.mul(BN_TWO)
        : // default guess for others
          EXPECTED_TIME_DEFAULT)
    ).toNumber()
  )
}
