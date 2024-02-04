/* eslint-disable import/prefer-default-export */
import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  display: inline-block;
  svg {
    vertical-align: middle;
  }

  .info-text {
    visibility: hidden;
    width: 120px;
    background-color: black;
    font-size: 10px;
    color: #fff;
    text-align: center;
    border-radius: 6px;
    padding: 4px 5px;
    position: absolute;
    z-index: 1;
    bottom: 150%;
    left: 50%;
    margin-left: -60px;
    line-height: 1.3;

    &:after {
      content: "";
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: #252523 transparent transparent transparent;
    }
  }

  &:hover .info-text {
    visibility: visible;
  }
`;

export function Tooltip({ children, infoText }:{ children: React.ReactNode, infoText: string}) {
  return (
    <Wrapper>
      {children}
      <span className="info-text">{infoText}</span>
    </Wrapper>
  );
}
