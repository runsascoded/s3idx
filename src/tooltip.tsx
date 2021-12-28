import * as mui from "@mui/material"
import { tooltipClasses, } from "@mui/material/Tooltip"
import { styled as muiStyled, } from "@mui/material/styles";
import React, {FC, useCallback, useMemo, useState} from "react";
import styled from "styled-components";
import {Set} from "./utils";
import useEventListener from "@use-it/event-listener";
import {entries} from "lodash";

export type MakeTooltipProps = {
    openTooltipId: string | null
    handleOpen: (id: string) => void
    handleClose: (id: string) => void
}
// We inject a component above the mui.Tooltip that pulls this state field (+setter) out as a prop, so that it is
// accessible from within the styling closure below. Is there a better / more idiomatic way to do this?
export type LiftedState = {
    clicked: boolean
    setClicked: Set<boolean>
}
export type CSS = { [k: string]: { [k: string]: string | number | undefined } }
export type Props = mui.TooltipProps & { id: string, css?: CSS, clickToPin?: boolean }
export type OuterProps = Props & MakeTooltipProps
export type InnerProps = OuterProps & LiftedState

const TooltipContainer = styled.span``

export const OuterTooltip = (props: OuterProps) => {
    // Need this to be a prop on the actual Tooltip below, so that it's passed to the `CreateStyledComponent` that
    // configures tooltip styles
    const [clicked, setClicked] = useState(false)
    return <InnerTooltip {...props} {...{ clicked, setClicked, }}/>
}

export const InnerTooltip = muiStyled(
    ({
         className, arrow, children, title,
         id, clickToPin, openTooltipId, handleOpen, handleClose,
         clicked, setClicked,
         ...props
    }: InnerProps) => {
        const [open, setOpen] = useState(false);
        if (openTooltipId !== id) {
            if (openTooltipId) {
                if (open) {
                    // console.log("Tooltip overriding open to false:", openTooltipId, "!==", id)
                    setOpen(false)
                }
                if (clicked) {
                    // console.log("Tooltip overriding clicked to false:", openTooltipId, "!==", id)
                    setClicked(false)
                }
            }
        }
        const handleTooltipOpen = (e: any) => {
            // console.log("Tooltip: open", id)
            setOpen(true);
            handleOpen(id)
        }
        const handleTooltipClose = (e: any) => {
            // console.log("Tooltip: close", id)
            if (clicked) {
                // console.log("  not propagating tooltip close due to clicked state")
            } else {
                setOpen(false);
                handleClose(id)
            }
        }
        const handleTooltipClick = (e: any) => {
            if (clickToPin === false) return  // default to true
            e.stopPropagation()
            e.preventDefault()
            // console.log("Tooltip: body click:", id)
            if (clicked) {
                setClicked(false)
                handleClose(id)
            } else {
                setClicked(true);
                handleOpen(id)
            }
        }

        function suppressClick(e: any) {
            // console.log("Tooltip: suppress click:", id)
            e.stopPropagation()
            e.preventDefault()
        }

        return (
                <mui.Tooltip
                    onClick={handleTooltipClick}
                    onOpen={handleTooltipOpen}
                    onClose={handleTooltipClose}
                    open={open || clicked}
                    arrow={arrow === undefined ? true : arrow}
                    title={<TooltipContainer onClick={suppressClick}>{title}</TooltipContainer>}
                    {...props}
                    classes={{ popper: className }}
                    PopperProps={{ disablePortal: true, }}
                >
                    {children}
                </mui.Tooltip>
        )
})(
    ({ theme, clicked, css, }) => {
        let baseStyle: CSS = {
            // Accessing `clicked` here (since it is a prop of `InnerTooltip`) is the reason for the existence of
            // `OuterTooltip`, which declares `clicked` as state and makes it a prop of `InnerTooltip`. Normally `clicked`
            // would be state on `InnerTooltip`.
            [`& .${tooltipClasses.tooltip}`]: {
                backgroundColor: theme.palette.common.black,
                color: theme.palette.common.white,
                fontSize: '1rem',
                padding: clicked ? '0.2rem' : '0.4rem',
                border: clicked ? '0.2rem solid orange' : undefined,
            },
            [`& .${tooltipClasses.arrow}`]: {
                color: theme.palette.common.black,
            },
        }
        entries(css).forEach(([ k, v, ]) => {
            if (k in baseStyle) {
                entries(v).forEach(([ k2, v2 ]) => {
                    baseStyle[k][k2] = v2
                })
            } else {
                baseStyle[k] = v
            }
        })
        return baseStyle
    }
);

export function makeTooltip(): FC<Props> {

    const [ openTooltipId, setOpenTooltipId,] = useState<string | null>(null)

    const clickHandler = useCallback(
        e => {
            // console.log("body click:", e)
            setOpenTooltipId(null)
        },
        []
    )
    useEventListener('click', clickHandler);

    const handleTooltipOpen = useCallback(
        (id: string) => {
            // console.log("Tooltip: **save,", openTooltipId, "to", id)
            setOpenTooltipId(id)
        }, [ openTooltipId, ]
    )

    const handleTooltipClose = useCallback(
        (id: string) => {
            // console.log("Tooltip: **evict,", openTooltipId, `to null ${id}`,)
            setOpenTooltipId(null)
        },
        [ openTooltipId ]
    )

    const tooltipProps: MakeTooltipProps = useMemo(
        () => ({
            openTooltipId,
            handleOpen: handleTooltipOpen,
            handleClose: handleTooltipClose,
        }),
        [ openTooltipId ],
    )

    const Tooltip = useCallback<(props: Props) => JSX.Element>(
        (props: Props) => <OuterTooltip {...tooltipProps} {...props} />,
        [ tooltipProps, ],
    )
    return Tooltip
}

export const center = {'&': { textAlign: 'center' }}

export default {
    makeTooltip, center
}
