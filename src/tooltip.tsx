import * as mui from "@mui/material";
import {tooltipClasses} from "@mui/material";
import React, {FC, useCallback, useMemo, useState} from "react";
import styled from "styled-components";
import {Setter} from "./utils";
import useEventListener from "@use-it/event-listener";

export type TooltipProps = {
    openTooltipId: string | null
    handleOpen: (id: string) => void
    handleClose: (id: string) => void
}
export type State = {
    clicked: boolean
    setClicked: Setter<boolean>
}
export type PublicProps = mui.TooltipProps & { id: string }
export type Props0 = PublicProps & TooltipProps
export type Props = Props0 & State

const TooltipContainer = styled.span``

export const Tooltip0 = (props: Props0) => {
    // Need this to be a prop on the actual Tooltip below, so that it's passed to the `CreateStyledComponent` that
    // configures tooltip styles
    const [clicked, setClicked] = useState(false)
    return <Tooltip {...props} {...{ clicked, setClicked, }}/>
}

export const Tooltip = mui.styled(
    ({
         className, arrow, children, title,
         id, openTooltipId, handleOpen, handleClose,
         clicked, setClicked,
         ...props
    }: Props) => {
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
                    key={"mui.Tooltip"}
                    onClick={handleTooltipClick}
                    onMouseOver={handleTooltipOpen}
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
    ({ theme, clicked }) => {
        return {
            [`& .${tooltipClasses.tooltip}`]: {
                backgroundColor: theme.palette.common.black,
                color: theme.palette.common.white,
                fontSize: '1em',
                padding: clicked ? '0.2em' : '0.4em',
                border: clicked ? '0.2em solid orange' : undefined,
            },
            [`& .${tooltipClasses.arrow}`]: {
                color: theme.palette.common.black,
            },
            '.settings-tooltip': {
                margin: '0.3rem 0',
            },
            '.control-header': {
                fontWeight: 'bold',
                marginBottom: '0.4rem',
            },
            '.sub-control > label': {
                display: 'block',
                marginBottom: 0,
            }
        }
    }
);

export function makeTooltip(): FC<PublicProps> {

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

    const tooltipProps: TooltipProps = useMemo(
        () => ({
            openTooltipId,
            handleOpen: handleTooltipOpen,
            handleClose: handleTooltipClose,
        }),
        [ openTooltipId ],
    )

    const Tooltip = useCallback<(props: PublicProps) => JSX.Element>(
        (props: PublicProps) => <Tooltip0 {...tooltipProps} {...props} />,
        [ tooltipProps, ],
    )
    return Tooltip
}
