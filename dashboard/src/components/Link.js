/**
 * Link.js
 * Custom link without decoration
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from 'react';
import { Link as reactRouterLink } from 'react-router-dom';
import styled from 'styled-components';


const Link = styled(reactRouterLink)`
    text-decoration: none;

    &:focus, &:hover, &:visited, &:link, &:active {
        text-decoration: none;
        color: inherit;
    }
`;

export default (props) => <Link {...props} />;