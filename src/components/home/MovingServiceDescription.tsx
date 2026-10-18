import React, { useEffect, useState } from "react";
import { Animated, View } from "react-native";

/**
 * Horizontally scrolling two-line service description used on promoted cards.
 * Exact same behavior and styles as previously inlined in home.tsx.
 */
export function MovingServiceDescription({
  text,
  color = "#666",
}: {
  text: string;
  color?: string;
}) {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);

  // Keep the description to two lines while gently moving it horizontally.
  const movingWidth = Math.max(
    containerWidth,
    Math.min(text.length * 5.2, containerWidth * 2.4),
  );

  useEffect(() => {
    translateX.stopAnimation();
    translateX.setValue(0);
    if (!text.trim() || containerWidth <= 0 || movingWidth <= containerWidth) return;

    const distance = movingWidth - containerWidth;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(translateX, {
          toValue: -distance,
          duration: Math.max(2800, distance * 42),
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(translateX, {
          toValue: 0,
          duration: Math.max(2800, distance * 42),
          useNativeDriver: true,
        }),
        Animated.delay(700),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [text, containerWidth, movingWidth, translateX]);

  if (!text.trim()) return null;

  return (
    <View
      style={{
        width: "100%",
        height: 26,
        overflow: "hidden",
        marginTop: 2,
        marginBottom: 2,
      }}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <Animated.Text
        numberOfLines={2}
        onLayout={(event) => {
          const measuredWidth = event.nativeEvent.layout.width;
          if (measuredWidth !== textWidth) setTextWidth(measuredWidth);
        }}
        style={{
          width: movingWidth || undefined,
          color,
          fontSize: 10,
          lineHeight: 12,
          transform: [{ translateX }],
        }}
      >
        {text.trim()}
      </Animated.Text>
    </View>
  );
}
