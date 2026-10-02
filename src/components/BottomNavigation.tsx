import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

import {useNavigation} from '@react-navigation/native';

type Props = {
  active?: 'Home' | 'Calendario' | 'Projetos' | 'Configuracoes';
};

export default function BottomNavigation({
  active = 'Home',
}: Props) {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>

        <NavItem
          icon="⌂"
          label="Hoje"
          active={active === 'Home'}
          onPress={() =>
            navigation.navigate('Home')
          }
        />

        <NavItem
          icon="▣"
          label="Calendário"
          active={active === 'Calendario'}
          onPress={() =>
            navigation.navigate('Calendario')
          }
        />

        <View style={styles.centerArea}>
          <Pressable
            style={({pressed}) => [
              styles.plusButton,
              pressed && styles.plusPressed,
            ]}
            onPress={() =>
              navigation.navigate('NovaTarefa')
            }>

            <Text style={styles.plus}>
              +
            </Text>

          </Pressable>
        </View>

        <NavItem
          icon="▤"
          label="Projetos"
          active={active === 'Projetos'}
          onPress={() =>
            navigation.navigate('Projetos')
          }
        />

        <NavItem
          icon="⚙"
          label="Config"
          active={active === 'Configuracoes'}
          onPress={() =>
            navigation.navigate('Configuracoes')
          }
        />

      </View>
    </View>
  );
}

function NavItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.item}
      onPress={onPress}>

      <View
        style={[
          styles.iconContainer,
          active && styles.activeIconContainer,
        ]}>

        <Text
          style={[
            styles.icon,
            active && styles.activeIcon,
          ]}>
          {icon}
        </Text>

      </View>

      <Text
        style={[
          styles.label,
          active && styles.activeLabel,
        ]}>
        {label}
      </Text>

      {active && (
        <View style={styles.activeDot} />
      )}

    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#F8F9FD',
  },

  container: {
    height: 76,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,

    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,

    shadowColor: '#1E1B3A',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,

    elevation: 12,
  },

  item: {
    flex: 1,
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  iconContainer: {
    width: 36,
    height: 32,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },

  activeIconContainer: {
    backgroundColor: '#EEF0FF',
  },

  icon: {
    fontSize: 20,
    color: '#A3ADC2',
  },

  activeIcon: {
    color: '#5C4DFF',
    fontWeight: '700',
  },

  label: {
    marginTop: 2,
    fontSize: 10,
    color: '#A3ADC2',
  },

  activeLabel: {
    color: '#5C4DFF',
    fontWeight: '700',
  },

  activeDot: {
    position: 'absolute',
    bottom: 4,

    width: 4,
    height: 4,

    borderRadius: 2,
    backgroundColor: '#5C4DFF',
  },

  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 76,
  },

  plusButton: {
    width: 60,
    height: 60,

    borderRadius: 20,

    backgroundColor: '#5C4DFF',

    justifyContent: 'center',
    alignItems: 'center',

    marginTop: -28,

    borderWidth: 5,
    borderColor: '#F8F9FD',

    shadowColor: '#5C4DFF',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,

    elevation: 10,
  },

  plusPressed: {
    transform: [
      {
        scale: 0.93,
      },
    ],
  },

  plus: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '300',
    lineHeight: 38,
  },
});