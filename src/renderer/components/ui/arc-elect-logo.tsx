/**
 * ARC ELECT Logo component.
 *
 * This component renders the ARC ELECT SVG logo with customizable size and styling.
 *
 * @module ArcElectLogo
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';

/**
 * Interface defining the props for the ArcElectLogo component.
 */
interface ArcElectLogoProps {
    /** CSS class name for styling */
    className?: string;
    /** Width of the logo */
    width?: number | string;
    /** Height of the logo */
    height?: number | string;
}

/**
 * ArcElectLogo component for rendering the ARC ELECT SVG logo.
 *
 * @param props - Component props
 * @param props.className - CSS class name for styling
 * @param props.width - Width of the logo
 * @param props.height - Height of the logo
 * @returns JSX element representing the ARC ELECT logo
 *
 * @example
 * ```tsx
 * <ArcElectLogo className="h-8 w-auto" />
 * ```
 */
const ArcElectLogo: React.FC<ArcElectLogoProps> = ({
    className = '',
    width,
    height,
}) => {
    return (
        <svg
            viewBox="0 0 600 150"
            version="1.1"
            width={width}
            height={height}
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
        >
            <g transform="translate(5,-309)">
                <g>
                    {/* ARC - Orange color (#da591a) */}
                    <path
                        style={{
                            fontStyle: 'normal',
                            fontWeight: 700,
                            fontSize: '72px',
                            lineHeight: 1,
                            fontFamily: "'Comfortaa Bold Alt2'",
                            fontVariantLigatures: 'none',
                            textAlign: 'center',
                            textAnchor: 'middle',
                            strokeWidth: 0,
                            strokeMiterlimit: 2,
                        }}
                        d="m 242.72649,409.21484 -22.53744,-53.78616 c -0.71928,-1.83816 -1.998,-2.7972 -3.91608,-2.7972 -1.83816,0 -3.11688,0.95904 -3.91608,2.7972 L 189.89937,409.055 a 4.4955,4.4955 0 0 0 -0.3996,1.83816 c 0,1.1988 0.31968,2.15784 1.11888,2.95704 0.7992,0.7992 1.75824,1.1988 2.95704,1.1988 0.7992,0 1.51848,-0.15984 2.23776,-0.63936 0.63936,-0.47952 1.1988,-1.03896 1.5984,-1.91808 l 19.02096,-46.51344 18.70128,46.51344 c 0.23976,0.7992 0.7992,1.43856 1.51848,1.91808 0.71928,0.47952 1.43856,0.63936 2.31768,0.63936 1.11888,0 2.15784,-0.3996 2.95704,-1.1988 q 1.1988,-1.1988 1.1988,-2.87712 c 0,-0.47952 -0.15984,-1.03896 -0.3996,-1.75824"
                        fill="#da591a"
                    />
                    <path
                        style={{
                            fontStyle: 'normal',
                            fontWeight: 700,
                            fontSize: '72px',
                            lineHeight: 1,
                            fontFamily: "'Comfortaa Bold Alt2'",
                            fontVariantLigatures: 'none',
                            textAlign: 'center',
                            textAnchor: 'middle',
                            strokeWidth: 0,
                            strokeMiterlimit: 2,
                        }}
                        d="m 281.37336,370.13396 c -6.71328,0 -12.3876,2.3976 -17.1828,7.11288 -4.71528,4.71528 -7.03296,10.3896 -7.03296,17.10288 v 16.86312 c 0,1.11888 0.31968,1.998 1.11888,2.71728 0.71928,0.7992 1.5984,1.11888 2.71728,1.11888 1.03896,0 1.91808,-0.31968 2.63736,-1.11888 0.7992,-0.71928 1.1988,-1.5984 1.1988,-2.71728 v -16.86312 c 0,-4.55544 1.5984,-8.47152 4.7952,-11.66832 3.27672,-3.27672 7.1928,-4.87512 11.74824,-4.87512 1.03896,0 1.91808,-0.3996 2.71728,-1.11888 0.71928,-0.7992 1.11888,-1.67832 1.11888,-2.71728 0,-1.03896 -0.3996,-1.998 -1.11888,-2.71728 -0.7992,-0.71928 -1.67832,-1.11888 -2.71728,-1.11888"
                        fill="#da591a"
                    />
                    <path
                        style={{
                            fontStyle: 'normal',
                            fontWeight: 700,
                            fontSize: '72px',
                            lineHeight: 1,
                            fontFamily: "'Comfortaa Bold Alt2'",
                            fontVariantLigatures: 'none',
                            textAlign: 'center',
                            textAnchor: 'middle',
                            strokeWidth: 0,
                            strokeMiterlimit: 2,
                        }}
                        d="m 333.37797,378.20588 c -4.15584,-4.7952 -9.43056,-7.1928 -15.66432,-7.1928 -4.15584,0 -7.91208,0.95904 -11.1888,2.87712 -3.35664,1.91808 -5.91408,4.55544 -7.75224,7.91208 -1.83816,3.35664 -2.71728,7.1928 -2.71728,11.42856 0,4.15584 0.87912,7.992 2.7972,11.34864 a 20.868,20.868 0 0 0 7.91208,7.91208 c 3.35664,1.91808 7.11399,2.87712 11.34864,2.87712 5.75424,0 10.54944,-1.75824 14.3856,-5.35464 q 0.95904,-0.95904 0.95904,-2.15784 c 0,-1.03896 -0.55944,-1.998 -1.51848,-2.87712 -0.63936,-0.47952 -1.35864,-0.71928 -2.07792,-0.71928 -0.95904,0 -1.998,0.3996 -2.95704,1.11888 -2.23776,1.91808 -5.1948,2.7972 -8.7912,2.7972 q -4.1958,0 -7.43256,-1.91808 -3.23676,-1.91808 -5.03496,-5.27472 c -1.1988,-2.23776 -1.75824,-4.87512 -1.75824,-7.75224 0,-4.47552 1.27872,-8.15184 3.83616,-10.86912 2.55744,-2.71728 5.83416,-4.15584 9.99,-4.15584 1.998,0 3.75624,0.3996 5.35464,1.03896 1.5984,0.63936 3.03696,1.67832 4.3956,3.11688 q 1.1988,1.43856 3.11688,1.43856 c 0.63936,0 1.27872,-0.15984 1.83816,-0.55944 1.11888,-0.7992 1.75824,-1.75824 1.75824,-2.95704 0,-0.7992 -0.31968,-1.43856 -0.7992,-2.07792"
                        fill="#da591a"
                    />

                    {/* ELECT - Brown color (#58411a) */}
                    <path
                        style={{
                            fontStyle: 'normal',
                            fontWeight: 700,
                            fontSize: '72px',
                            lineHeight: 1,
                            fontFamily: "'Comfortaa Bold Alt2'",
                            fontVariantLigatures: 'none',
                            textAlign: 'center',
                            textAnchor: 'middle',
                            strokeWidth: 0,
                            strokeMiterlimit: 2,
                        }}
                        d="m 419.36967,408.41564 a 4.5843,4.5843 0 0 0 -2.95704,-1.03896 h -31.968 v -19.98 h 22.93704 c 1.11888,0 2.07792,-0.31968 2.87712,-1.03896 0.7992,-0.71928 1.1988,-1.67832 1.1988,-2.7972 0,-1.11888 -0.3996,-1.998 -1.1988,-2.71728 -0.7992,-0.71928 -1.75824,-1.11888 -2.87712,-1.11888 H 384.44463 V 360.3038 h 31.968 c 1.1988,0 2.15784,-0.31968 2.95704,-1.03896 0.71928,-0.63936 1.11888,-1.5984 1.11888,-2.71728 0,-1.11888 -0.3996,-2.07792 -1.11888,-2.7972 -0.7992,-0.71928 -1.75824,-1.11888 -2.95704,-1.11888 H 380.2899 c -1.1988,0 -2.15784,0.3996 -2.95704,1.1988 -0.7992,0.7992 -1.1988,1.75824 -1.1988,2.95704 v 54.10584 c 0,1.1988 0.3996,2.15784 1.1988,2.95704 0.7992,0.7992 1.75824,1.1988 2.95704,1.1988 h 36.12384 c 1.1988,0 2.15784,-0.31968 2.95704,-1.03896 0.71928,-0.71928 1.11888,-1.67832 1.11888,-2.87712 0,-1.11888 -0.3996,-1.998 -1.11888,-2.71728 z"
                        fill="#58411a"
                    />
                    <path
                        style={{
                            fontStyle: 'normal',
                            fontWeight: 700,
                            fontSize: '72px',
                            lineHeight: 1,
                            fontFamily: "'Comfortaa Bold Alt2'",
                            fontVariantLigatures: 'none',
                            textAlign: 'center',
                            textAnchor: 'middle',
                            strokeWidth: 0,
                            strokeMiterlimit: 2,
                        }}
                        d="m 436.28607,353.75036 c -0.7992,0.7992 -1.11888,1.75824 -1.11888,2.87712 v 43.63632 c 0,2.87712 0.47952,5.43456 1.51848,7.67232 0.95904,2.23776 2.3976,3.996 4.23576,5.27472 1.83816,1.27872 3.91608,1.83816 6.23487,1.83816 h 0.15984 c 1.5984,0 2.87712,-0.31968 3.91608,-1.11888 0.95904,-0.71928 1.51848,-1.67832 1.51848,-2.87712 0,-1.11888 -0.3996,-2.07792 -1.03896,-2.87712 -0.63936,-0.71928 -1.51848,-1.11888 -2.55744,-1.11888 h -1.998 q -1.7982,0 -2.87712,-1.91808 c -0.7992,-1.27872 -1.11888,-2.87712 -1.11888,-4.87512 v -43.63632 c 0,-1.11888 -0.3996,-2.07792 -1.11888,-2.87712 -0.7992,-0.71928 -1.75824,-1.11888 -2.87712,-1.11888 -1.1988,0 -2.15784,0.3996 -2.87712,1.11888 z"
                        fill="#58411a"
                    />
                    <path
                        style={{
                            fontStyle: 'normal',
                            fontWeight: 700,
                            fontSize: '72px',
                            lineHeight: 1,
                            fontFamily: "'Comfortaa Bold Alt2'",
                            fontVariantLigatures: 'none',
                            textAlign: 'center',
                            textAnchor: 'middle',
                            strokeWidth: 0,
                            strokeMiterlimit: 2,
                        }}
                        d="m 482.79396,415.36868 c 5.27472,0 9.91008,-1.5984 13.986,-4.95504 0.87912,-0.63936 1.27872,-1.51848 1.43856,-2.55744 0.0799,-1.11888 -0.15984,-1.998 -0.87912,-2.87712 a 3.552,3.552 0 0 0 -2.55744,-1.35864 c -1.03896,-0.0799 -1.998,0.15984 -2.7972,0.87912 -2.71728,2.15784 -5.75424,3.1968 -9.1908,3.1968 -3.996,0 -7.43256,-1.35864 -10.22976,-4.23576 -2.87712,-2.7972 -4.23576,-6.23376 -4.23576,-10.22976 0,-3.996 1.35864,-7.43256 4.23576,-10.30968 2.7972,-2.7972 6.23376,-4.23576 10.22976,-4.23576 3.27672,0 6.23376,1.03896 8.87112,3.03696 2.55744,1.998 4.23576,4.55544 5.11488,7.67232 h -13.986 c -1.03896,0 -1.998,0.3996 -2.71728,1.11888 a 3.8073,3.8073 0 0 0 -1.11888,2.71728 c 0,1.03896 0.3996,1.998 1.11888,2.71728 a 3.8073,3.8073 0 0 0 2.71728,1.11888 h 18.3816 c 1.03896,0 1.91808,-0.3996 2.63736,-1.11888 a 3.5742,3.5742 0 0 0 1.1988,-2.71728 c 0,-6.15384 -2.23776,-11.34864 -6.55344,-15.66432 -4.31568,-4.31568 -9.51048,-6.55344 -15.66432,-6.55344 -6.15384,0 -11.34864,2.23776 -15.66432,6.55344 -4.31568,4.31568 -6.47352,9.51048 -6.47352,15.66432 0,6.15384 2.15784,11.34864 6.47352,15.66432 4.31568,4.31568 9.51048,6.47352 15.66432,6.47352"
                        fill="#58411a"
                    />
                    <path
                        style={{
                            fontStyle: 'normal',
                            fontWeight: 700,
                            fontSize: '72px',
                            lineHeight: 1,
                            fontFamily: "'Comfortaa Bold Alt2'",
                            fontVariantLigatures: 'none',
                            textAlign: 'center',
                            textAnchor: 'middle',
                            strokeWidth: 0,
                            strokeMiterlimit: 2,
                        }}
                        d="m 552.72396,378.20588 c -4.15584,-4.7952 -9.43056,-7.1928 -15.66432,-7.1928 -4.15584,0 -7.91208,0.95904 -11.1888,2.87712 -3.35664,1.91808 -5.91408,4.55544 -7.75224,7.91208 -1.83816,3.35664 -2.71728,7.1928 -2.71728,11.42856 0,4.15584 0.87912,7.992 2.7972,11.34864 a 20.868,20.868 0 0 0 7.91208,7.91208 c 3.35664,1.91808 7.11288,2.87712 11.34864,2.87712 5.75424,0 10.54944,-1.75824 14.3856,-5.35464 q 0.95904,-0.95904 0.95904,-2.15784 c 0,-1.03896 -0.55944,-1.998 -1.51848,-2.87712 -0.63936,-0.47952 -1.35864,-0.71928 -2.07792,-0.71928 -0.95904,0 -1.998,0.3996 -2.95704,1.11888 -2.23776,1.91808 -5.1948,2.7972 -8.7912,2.7972 q -4.1958,0 -7.43256,-1.91808 -3.23676,-1.91808 -5.03496,-5.27472 c -1.1988,-2.23776 -1.75824,-4.87512 -1.75824,-7.75224 0,-4.47552 1.27872,-8.15184 3.83616,-10.86912 2.55744,-2.71728 5.83416,-4.15584 9.99,-4.15584 1.998,0 3.75624,0.3996 5.35464,1.03896 1.5984,0.63936 3.03696,1.67832 4.3956,3.11688 q 1.1988,1.43856 3.11688,1.43856 c 0.63936,0 1.27872,-0.15984 1.83816,-0.55944 1.11888,-0.7992 1.75824,-1.75824 1.75824,-2.95704 0,-0.7992 -0.31968,-1.43856 -0.7992,-2.07792"
                        fill="#58411a"
                    />
                    <path
                        style={{
                            fontStyle: 'normal',
                            fontWeight: 700,
                            fontSize: '72px',
                            lineHeight: 1,
                            fontFamily: "'Comfortaa Bold Alt2'",
                            fontVariantLigatures: 'none',
                            textAlign: 'center',
                            textAnchor: 'middle',
                            strokeWidth: 0,
                            strokeMiterlimit: 2,
                        }}
                        d="m 589.48827,407.057 c -2.31768,0 -4.31568,-0.7992 -5.91408,-2.47752 -1.67832,-1.5984 -2.47752,-3.5964 -2.47752,-5.91408 v -18.7812 h 7.11288 c 0.95904,0 1.83816,-0.31968 2.55744,-1.03896 a 3.552,3.552 0 0 0 1.03896,-2.55744 c 0,-0.95904 -0.3996,-1.83816 -1.03896,-2.55744 -0.71928,-0.63936 -1.5984,-1.03896 -2.55744,-1.03896 h -7.11288 v -11.26872 c 0,-1.11888 -0.3996,-1.998 -1.1988,-2.7972 -0.7992,-0.7992 -1.67832,-1.1988 -2.7972,-1.1988 q -1.67832,0 -2.87712,1.1988 c -0.7992,0.7992 -1.11888,1.67832 -1.11888,2.7972 v 37.24272 c 0,4.55544 1.5984,8.3916 4.7952,11.5884 3.1968,3.1968 7.03296,4.7952 11.5884,4.7952 1.11888,0 1.998,-0.31968 2.7972,-1.11888 q 1.1988,-1.1988 1.1988,-2.87712 c 0,-1.11888 -0.3996,-1.998 -1.1988,-2.7972 -0.7992,-0.7992 -1.67832,-1.1988 -2.7972,-1.1988"
                        fill="#58411a"
                    />

                    {/* Icon image */}
                    <image
                        xlinkHref="data:image/png;base64,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"
                        x="-5"
                        y="309"
                        width="150"
                        height="150"
                    />
                </g>
            </g>
        </svg>
    );
};

export { ArcElectLogo };
