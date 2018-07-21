/**
 * MenuPreview.js
 * Menu preview component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import moment from "moment";
import { observer, inject } from "mobx-react";
import { withStyles } from "@material-ui/core/styles";
import Paper from '@material-ui/core/Paper';

const styles = theme => ({
    paper: {
        paddingTop: "2em",
        paddingLeft: "3em",
        paddingRight: "3em",
        paddingBottom: "2em"
    },
    condimentsList: {
        listStyleType: "none",
        paddingTop: "0.5em",
    }
});

const MenuPreview = inject("ctx")(
    observer(
        class extends React.Component {
            render() {
                const {classes} = this.props,
                    menu = this.props.menu,
                    deadlineReached = moment().isAfter(menu.deadline);
                return (
                    <Paper elevation={1} className={classes.paper}>
                        <h2>Daily menu - {moment(menu.day).format("MMMM Do YYYY")}</h2>
                        {menu.firstCourse && <div>
                            <h4>First courses</h4>
                            <div>{menu.firstCourse.items.map((fc, fck) => {
                                return (<ul key={fck}>
                                    <li>{fc.value}</li>
                                    {fc.condiments && fc.condiments.length > 0 && <li className={classes.condimentsList}>
                                        <ul>
                                            {fc.condiments.map((c, k) => <li key={k}>{c}</li>)}
                                        </ul>
                                    </li>}
                                </ul>)
                            })}</div>
                        </div>}
                        {menu.secondCourse && menu.secondCourse.items.length > 0 && <div>
                            <h4>Second courses</h4>
                            <div><ul>{menu.secondCourse.items.map((sc, k) => <li key={k}>{sc}</li>)}</ul></div>
                        </div>}
                        {menu.secondCourse && menu.secondCourse.sideDishes.length > 0 && <div>
                            <h4>Side dishes</h4>
                            <div><ul>{menu.secondCourse.sideDishes.map((sd, k) => <li key={k}>{sd}</li>)}</ul></div>
                        </div>}
                        {menu.additionalInfos && menu.additionalInfos !== "" && <div>
                            <h4>Additional information</h4>
                            <p>{menu.additionalInfos}</p>
                        </div>}

                        {deadlineReached && <p>{"The deadline was at " + moment(menu.deadline).format("HH:mm") + ". No more orders will be accepted."}</p>}

                        {!deadlineReached && <p>{"Hurry up, the deadline is at " + moment(menu.deadline).format("HH:mm")}</p>}

                    </Paper>
                )
            }
        })
);

/*
function formatMenu(menu) {
    let text =
        "\n__Daily menu__: *" + moment(menu.day).format("MMMM Do YYYY") + "*";
    if (menu.firstCourse && menu.firstCourse.items && menu.firstCourse.items.length) {
        text += "\n\n__First courses__:";
        menu.firstCourse.items.map((fc) => {
            text = text + "\n\n- *" + fc.value + "*" + (fc.condiments.length > 0 ? ":" : "");
            fc.condiments.map((c) => {
                text = text + "\n  -- *" + c + "*"
            });
        });
    }
    if (menu.secondCourse && menu.secondCourse.items && menu.secondCourse.items.length) {
        text = text + "\n\n__Second courses__:\n"
        menu.secondCourse.items.map((sc) => {
            text = text + "\n - *" + sc + "*"
        });
    }
    if (menu.secondCourse && menu.secondCourse.sideDishes && menu.secondCourse.sideDishes.length) {
        text = text + "\n\n__Side dishes__:\n"
        menu.secondCourse.sideDishes.map((sd) => {
            text = text + "\n - *" + sd + "*"
        });
    }
    if (menu.additionalInfos && menu.additionalInfos != "") {
        text = text + "\n\n__Additional information__:\n*" + menu.additionalInfos + "*"
    }
    if (moment().isAfter(menu.deadline)) {
        text = text + "\n\nThe deadline was at *" + moment(menu.deadline).format("HH:mm") + "*.\nNo more orders will be accepted.";
    } else {
        text = text + "\n\nHurry up, the deadline is at *" + moment(menu.deadline).format("HH:mm") + "*" +
            "\n\n(🍻 Beers are sold separately 😬)";
    }

    return text;
}*/

export default withStyles(styles)(MenuPreview);