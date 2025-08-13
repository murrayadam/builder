import { fastClone } from '../functions/utils';

export type Size = 'large' | 'medium' | 'small' | 'xsmall' | 'xlarge' | 'xxlarge';
export const sizeNames: Size[] = ['xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge'];

// TODO: put in @builder.io/core
const sizes = {
  xsmall: {
    min: 0,
    default: 160,
    max: 320,
  },
  small: {
    min: 321,
    default: 321,
    max: 640,
  },
  medium: {
    min: 641,
    default: 642,
    max: 991,
  },
  large: {
    min: 990,
    default: 991,
    max: 1200,
  },
  xlarge: {
    min: 1201,
    default: 1440,
    max: 1920,
  },
  xxlarge: {
    min: 1921,
    default: 2560,
    max: 9999,
  },
  getWidthForSize(size: Size) {
    return this[size].default;
  },
  getSizeForWidth(width: number) {
    for (const size of sizeNames) {
      const value = this[size];
      if (width <= value.max) {
        return size;
      }
    }
    return 'xxlarge';
  },
};
export type Sizes = typeof sizes;

export interface Breakpoints {
  xsmall?: number;
  small?: number;
  medium?: number;
  xlarge?: number;
  xxlarge?: number;
}

export const getSizesForBreakpoints = (breakpoints: Breakpoints) => {
  const newSizes = {
    ...sizes, // Note: this helps get the function from sizes
    ...fastClone(sizes), // Note: this helps to get a deep clone of fields like small, medium etc
  };

  if (!breakpoints) {
    return newSizes;
  }

  const { xsmall, small, medium, xlarge, xxlarge } = breakpoints;

  if (xsmall) {
    const xsmallMin = Math.floor(xsmall / 2);
    newSizes.xsmall = {
      max: xsmall,
      min: xsmallMin,
      default: xsmallMin + 1,
    };
  }

  if (!small || !medium) {
    return newSizes;
  }

  const smallMin = xsmall ? newSizes.xsmall.max + 1 : Math.floor(small / 2);
  newSizes.small = {
    max: small,
    min: smallMin,
    default: smallMin + 1,
  };

  const mediumMin = newSizes.small.max + 1;
  newSizes.medium = {
    max: medium,
    min: mediumMin,
    default: mediumMin + 1,
  };

  const largeMin = newSizes.medium.max + 1;
  const largeMax = xlarge ? xlarge : newSizes.large.max;
  newSizes.large = {
    max: largeMax,
    min: largeMin,
    default: largeMin + 1,
  };

  if (xlarge) {
    const xlargeMin = newSizes.large.max + 1;
    const xlargeMax = xxlarge ? xxlarge : newSizes.xlarge.max;
    newSizes.xlarge = {
      max: xlargeMax,
      min: xlargeMin,
      default: xlargeMin + 1,
    };
  }

  if (xxlarge) {
    const xxlargeMin = xlarge ? newSizes.xlarge.max + 1 : newSizes.large.max + 1;
    newSizes.xxlarge = {
      max: newSizes.xxlarge.max,
      min: xxlargeMin,
      default: xxlargeMin + 1,
    };
  }

  return newSizes;
};
