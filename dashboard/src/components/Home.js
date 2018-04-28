/**
 * Home.js
 * Home component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { withStyles } from "material-ui/styles";
import GridList, { GridListTile, GridListTileBar } from 'material-ui/GridList';
import Subheader from 'material-ui/List/ListSubheader';
import Autorenew from '@material-ui/icons/Autorenew';

const styles = theme => ({
    root: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
    },
    gridList: {
        //width: 500,
        //height: "100vh",
    },
    tileBar: {
        cursor: "pointer",
    },
    icon: {
        color: 'rgba(255, 255, 255, 0.54)',
    },
    value: {
        fontSize: "2.75rem"
    }
});

const Home = inject("ctx")(
    observer(
        class extends React.Component {
            constructor(props) {
                super(props);
                this.props.ctx.stats.fetch();
            }

            componentDidMount() {
                this.props.ctx.stats.setAutoRefresh(true);
            }

            componentWillUnmount() {
                this.props.ctx.stats.setAutoRefresh(false);
            }

            render() {
                const { classes } = this.props;
                const dailyMenuLinkID = this.props.ctx.stats.dailyMenu && this.props.ctx.stats.dailyMenu._id ? this.props.ctx.stats.dailyMenu._id : "new";
                const tileData = [
                    {
                        img: "/static/images/home_tongue.gif",
                        title: 'Daily Menu Status',
                        cols: 2,
                        action: () => { this.props.ctx.history.push("/menus/" + dailyMenuLinkID) },
                        value: (this.props.ctx.stats.dailyMenu && this.props.ctx.stats.dailyMenu.enabled) ? "OK" : "not ready!",
                    }, {
                        img: "/static/images/home_drink.gif",
                        title: 'Menus',
                        cols: 1,
                        action: () => { this.props.ctx.history.push("/menus") },
                        value: this.props.ctx.stats.menus,
                    }, {
                        img: "/static/images/home_dancing.webp",
                        title: 'Orders',
                        cols: 1,
                        action: () => { this.props.ctx.history.push("/orders") },
                        value: this.props.ctx.stats.dailyOrders + " (" + this.props.ctx.stats.orders + ")",
                    }, {
                        img: "/static/images/home_smoke.gif",
                        title: 'Active Users',
                        cols: 1,
                        action: () => { this.props.ctx.history.push("/users") },
                        value: this.props.ctx.stats.users,
                    }, {
                        img: "/static/images/home_users.gif",
                        title: 'Pending Users',
                        action: () => { this.props.ctx.history.push("/users") },
                        cols: 1,
                        value: this.props.ctx.stats.usersPending,
                    },
                ];
                return (
                    <div className={classes.root}>
                        <GridList cellHeight={180} cols={3} className={classes.gridList}>
                            <GridListTile key="Subheader" cols={3} style={{ height: 'auto' }}>
                                <Subheader component="div">BTB - Smart Menu Ordering System {this.props.ctx.stats.isLoading ? <Autorenew /> : ""}</Subheader>
                            </GridListTile>
                            {tileData.map(tile => (
                                <GridListTile key={tile.img} cols={tile.cols || 1}>
                                    <img src={tile.img} alt={tile.title} />
                                    <GridListTileBar
                                        className={tile.action ? classes.tileBar : undefined}
                                        onClick={tile.action}
                                        title={tile.title}
                                        subtitle={<span className={classes.value}>{tile.value}</span>}
                                    />
                                </GridListTile>
                            ))}
                        </GridList>
                    </div>
                );
            }
        }));

export default withStyles(styles)(Home);