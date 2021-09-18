import moment, { Moment } from "moment"
import { encodeAddress, decodeAddress } from "@polkadot/util-crypto/address"
import { TransformedSubstrateAddress } from "../types"
import * as prefixes from "../utils/ss58-registry.json"

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
  dateTime: string,
  transformUtc: boolean
): Moment => {
  let auxMoment
  if (transformUtc) {
    auxMoment = moment.utc(dateTime)
  } else {
    auxMoment = moment(dateTime)
  }
  return auxMoment
}

export const transformAddress = (key: string): TransformedSubstrateAddress[] => {
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
