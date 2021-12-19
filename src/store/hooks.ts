import { Dispatch } from "react"
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux"
import { AnyAction } from "redux"
import type { RootState, AppDispatch } from "./"

export const useAppDispatch = (): Dispatch<AnyAction> =>
  useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
