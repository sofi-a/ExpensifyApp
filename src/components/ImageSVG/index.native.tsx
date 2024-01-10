import {Image} from 'expo-image';
import React from 'react';
import type {ImageSourcePropType} from 'react-native';
import type {SvgProps} from 'react-native-svg';
import type ImageSVGProps from './types';

function ImageSVG({
    src,
    width = '100%',
    height = '100%',
    fill,
    contentFit = 'cover',
    hovered = false,
    pressed = false,
    style,
    pointerEvents,
    preserveAspectRatio
}: ImageSVGProps) {
    const tintColorProp = fill ? {tintColor: fill} : {};

    if (typeof src === 'function') {
        const ImageSvgComponent = src as React.FC<SvgProps>;
        const additionalProps: Pick<ImageSVGProps, 'fill' | 'pointerEvents' | 'preserveAspectRatio'> = {};

        if (fill) {
            additionalProps.fill = fill;
        }
    
        if (pointerEvents) {
            additionalProps.pointerEvents = pointerEvents;
        }
    
        if (preserveAspectRatio) {
            additionalProps.preserveAspectRatio = preserveAspectRatio;
        }

        return (
            <ImageSvgComponent
                width={width}
                height={height}
                fill={fill}
                hovered={`${hovered}`}
                pressed={`${pressed}`}
                style={style}
                {...additionalProps}
            />
        )
    }

    return (
        <Image
            contentFit={contentFit}
            source={src as ImageSourcePropType}
            style={[{width, height}, style]}
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...tintColorProp}
        />
    );
}

ImageSVG.displayName = 'ImageSVG';
export default ImageSVG;
