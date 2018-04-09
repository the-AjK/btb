/**
 * MultipleSelect.js
 * Multiple select component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from 'react';
import { observer } from "mobx-react";
import { action } from "mobx";
import PropTypes from 'prop-types';
import keycode from 'keycode';
import Downshift from 'downshift';
import { withStyles } from 'material-ui/styles';
import TextField from 'material-ui/TextField';
import Paper from 'material-ui/Paper';
import { MenuItem } from 'material-ui/Menu';
import Chip from 'material-ui/Chip';

function renderInput(inputProps) {
    const { InputProps, classes, ref, ...other } = inputProps;
    return (
        <TextField
            InputProps={{
                inputRef: ref,
                classes: {
                    root: classes.inputRoot,
                },
                ...InputProps,
            }}
            {...other}
        />
    );
}

function renderSuggestion({ suggestion, index, itemProps, highlightedIndex, selectedItem }) {
    const isHighlighted = highlightedIndex === index;
    const isSelected = (selectedItem || '').indexOf(suggestion.label) > -1;
    return (
        <MenuItem
            {...itemProps}
            key={suggestion.label}
            selected={isHighlighted}
            component="div"
            style={{
                fontWeight: isSelected ? 500 : 400,
            }}
        >
            {suggestion.label}
        </MenuItem>
    );
}
renderSuggestion.propTypes = {
    highlightedIndex: PropTypes.number,
    index: PropTypes.number,
    itemProps: PropTypes.object,
    selectedItem: PropTypes.string,
    suggestion: PropTypes.shape({ label: PropTypes.string }).isRequired,
};

const DownshiftMultiple = observer(
    class extends React.Component {

        constructor(props) {
            super(props);
            this.state = {
                inputValue: '',
            };
        }

        getSuggestions = (inputValue) => {
            let count = 0;
            return this.props.suggestions.filter(suggestion => {
                const keep =
                    (!inputValue || suggestion.label.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1) &&
                    count < 5;
                if (keep) {
                    count += 1;
                }
                return keep;
            });
        }

        handleKeyDown = event => {
            const { inputValue } = this.state;
            if (this.props.selectedItem.length && !inputValue.length && keycode(event) === 'backspace') {
                //Remove the last item with backspace? nahhh
                //this.setState({
                //    selectedItem: selectedItem.slice(0, selectedItem.length - 1),
                //});
            } else if (inputValue.length && keycode(event) === 'enter') {
                this.handleChange(inputValue);
            }
        };

        handleInputChange = event => {
            this.setState({ inputValue: event.target.value });
        };

        handleChange = action(item => {
            if (!this.props.multiple && this.props.selectedItem.length === 1)
                return;
            if (this.props.selectedItem.indexOf(item) === -1) {
                this.props.selectedItem.push(item)
            }
            if (this.props.suggestions.map((s) => s.label).indexOf(item) < 0) {
                this.props.suggestions.push({ label: item });
            }
            this.setState({
                inputValue: ''
            });
            this.props.onChange(this.props.selectedItem);
            this.forceUpdate();
        });

        handleDelete = item => action(() => {
            this.props.selectedItem.splice(this.props.selectedItem.indexOf(item), 1);
            this.props.onChange(this.props.selectedItem);
            this.forceUpdate();
        });

        render() {
            const { classes } = this.props;
            const { inputValue } = this.state;
            
            return (
                <Downshift inputValue={inputValue} onChange={this.handleChange} selectedItem={this.props.selectedItem}>
                    {({
                        getInputProps,
                        getItemProps,
                        isOpen,
                        inputValue: inputValue2,
                        selectedItem: selectedItem2,
                        highlightedIndex,
                    }) => (
                            <div className={classes.container}>
                                {this.props.selectedItem.map(item => (
                                    <Chip
                                        key={item}
                                        tabIndex={-1}
                                        label={item}
                                        className={classes.chip}
                                        onDelete={this.props.showChipDelete ? this.handleDelete(item) : null}
                                    />
                                ))}
                                {(this.props.multiple || (!this.props.multiple && this.props.selectedItem.length < 1)) && this.props.showInput && renderInput({
                                    fullWidth: true,
                                    classes,
                                    InputProps: getInputProps({
                                        /*startAdornment: selectedItem.map(item => (
                                            <Chip
                                                key={item}
                                                tabIndex={-1}
                                                label={item}
                                                className={classes.chip}
                                                onDelete={this.handleDelete(item)}
                                            />
                                        )),*/
                                        onChange: this.handleInputChange,
                                        onKeyDown: this.handleKeyDown,
                                        placeholder: this.props.placeholder || '',
                                        id: 'integration-downshift-multiple',
                                    }),
                                })}
                                {(isOpen && this.props.multiple) || (isOpen && (!this.props.multiple && this.props.selectedItem.length < 1)) ? (
                                    <Paper className={classes.paper} square>
                                        {this.getSuggestions(inputValue2).map((suggestion, index) =>
                                            renderSuggestion({
                                                suggestion,
                                                index,
                                                itemProps: getItemProps({ item: suggestion.label }),
                                                highlightedIndex,
                                                selectedItem: selectedItem2,
                                            }),
                                        )}
                                    </Paper>
                                ) : null}
                            </div>
                        )}
                </Downshift>
            );
        }
    });

DownshiftMultiple.propTypes = {
    classes: PropTypes.object.isRequired,
};

const styles = theme => ({
    root: {
        flexGrow: 1,
        //height: 250,
    },
    container: {
        flexGrow: 1,
        position: 'relative',
    },
    paper: {
        position: 'absolute',
        zIndex: 1,
        marginTop: theme.spacing.unit,
        left: 0,
        right: 0,
    },
    chip: {
        margin: `${theme.spacing.unit / 2}px ${theme.spacing.unit / 4}px`,
    },
    inputRoot: {
        flexWrap: 'wrap',
    },
});

const MultipleSelect = observer(
    class extends React.Component {
        render() {
            const { classes } = this.props;
            return (
                <div className={classes.root}>
                    <DownshiftMultiple classes={classes} {...this.props} />
                </div>
            );
        }
    });

MultipleSelect.propTypes = {
    classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(MultipleSelect);
