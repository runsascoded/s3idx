import * as mui from "@mui/material";
import {ClickAwayListener, tooltipClasses, TooltipProps} from "@mui/material";
import React, {useState} from "react";

export const Tooltip = mui.styled(
    ({ className, arrow, children, ...props }: TooltipProps) => {
        const [open, setOpen] = useState(false);
        const [clicked, setClicked] = useState(false)
        const handleTooltipOpen = (e: any) => {
            console.log("open:", e)
            setOpen(true);
        }
        const handleTooltipClose = (e: any) => {
            console.log("close:", e)
            setOpen(false);
        }
        const handleTooltipClick = (e: any) => {
            e.stopPropagation()
            console.log("click:", e)
            setClicked(true);
        }
        const handleTooltipClickAway = (e: any) => {
            console.log("click away:", e)
            setClicked(false);
        }
        return (
            <ClickAwayListener onClickAway={handleTooltipClickAway}>
                <mui.Tooltip
                    onClick={handleTooltipClick}
                    onMouseOver={handleTooltipOpen}
                    onOpen={handleTooltipOpen}
                    onClose={handleTooltipClose}
                    open={open || clicked}
                    arrow={arrow === undefined ? true : arrow}
                    {...props}
                    classes={{ popper: className }}
                    PopperProps={{ disablePortal: true, }}
                >
                    {children}
                </mui.Tooltip>
            </ClickAwayListener>
        )
})(
    ({ theme }) => ({
        [`& .${tooltipClasses.tooltip}`]: {
            backgroundColor: theme.palette.common.black,
            color: theme.palette.common.white,
            fontSize: '1rem',
            marginBottom: '0.2rem',
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
    })
);
